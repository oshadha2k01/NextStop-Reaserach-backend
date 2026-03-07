const mongoose = require('mongoose');

// GET latest peopleConut row
exports.getPeopleConutData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('people_count');

    const data = await collection.find({}).sort({ timestamp: -1 }).limit(1).toArray();

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    return res.json(data[0]);
  } catch (error) {
    console.error('Error fetching peopleConut data:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// GET peopleConut with filtering
exports.getPeopleConutFiltered = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('people_count');

    const { startDate, endDate, limit = 50, skip = 0 } = req.query;

    const parsedLimit = Number.parseInt(limit, 10) || 50;
    const parsedSkip = Number.parseInt(skip, 10) || 0;

    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const data = await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(parsedSkip)
      .limit(parsedLimit)
      .toArray();

    const total = await collection.countDocuments(filter);

    return res.json({
      total,
      count: data.length,
      skip: parsedSkip,
      limit: parsedLimit,
      data,
    });
  } catch (error) {
    console.error('Error fetching filtered peopleConut data:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// GET aggregate stats for peopleConut
exports.getPeopleConutStats = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('people_count');

    const { timeRange = 'all' } = req.query;

    const matchStage = {};
    const now = new Date();

    if (timeRange === 'hour') {
      matchStage.timestamp = { $gte: new Date(now.getTime() - 60 * 60 * 1000) };
    } else if (timeRange === 'day') {
      matchStage.timestamp = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
    } else if (timeRange === 'week') {
      matchStage.timestamp = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    } else if (timeRange === 'month') {
      matchStage.timestamp = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }

    const stats = await collection
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalInCount: { $sum: '$in_count' },
            totalOutCount: { $sum: '$out_count' },
            avgPeople: { $avg: '$total_people' },
            maxPeople: { $max: '$total_people' },
            minPeople: { $min: '$total_people' },
            recordCount: { $sum: 1 },
          },
        },
      ])
      .toArray();

    return res.json({
      timeRange,
      stats:
        stats.length > 0
          ? stats[0]
          : {
              totalInCount: 0,
              totalOutCount: 0,
              avgPeople: 0,
              maxPeople: 0,
              minPeople: 0,
              recordCount: 0,
            },
    });
  } catch (error) {
    console.error('Error fetching peopleConut stats:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// GET peopleConut history
exports.getPeopleConutHistory = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('people_count');

    const { limit = 100 } = req.query;
    const parsedLimit = Number.parseInt(limit, 10) || 100;

    const data = await collection.find({}).sort({ timestamp: -1 }).limit(parsedLimit).toArray();

    const history = data.reverse();

    return res.json({
      count: history.length,
      data: history.map((item) => ({
        timestamp: item.timestamp,
        in_count: item.in_count,
        out_count: item.out_count,
        total_people: item.total_people,
        frame_number: item.frame_number,
      })),
    });
  } catch (error) {
    console.error('Error fetching peopleConut history:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};
