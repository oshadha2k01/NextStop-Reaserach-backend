const BusData = require('../../models/BusRealTimeData');
const mongoose = require('mongoose');

exports.saveBusData = async (req, res) => {
    try {
        const { busId, currentLatitude, currentLongitude } = req.body;
        if (!busId || !currentLatitude || !currentLongitude) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        const newData = new BusData(req.body);
        await newData.save();

        res.status(201).json({ message: 'Bus data saved' });
    } catch (error) {
        console.error('Error saving bus data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getLatestBusLocation = async (req, res) => {
    try {
        const { busId } = req.params;
        const latestData = await BusData.findOne({ busId })
                                      .sort({ timestamp: -1 })
                                      .limit(1);

        if (!latestData) {
            return res.status(404).json({ message: `Bus ${busId} not found or no data.` });
        }
        res.status(200).json(latestData);
    } catch (error) {
        console.error('Error fetching latest location:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Simple GET API to retrieve latest people count data
exports.getPeopleCountData = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collection = db.collection('people_count');

        const data = await collection.find({})
            .sort({ timestamp: -1 })
            .limit(1)
            .toArray();

        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        res.json(data[0]);
    } catch (error) {
        console.error('Error fetching people count data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Get people count data with filtering options
exports.getPeopleCountFiltered = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collection = db.collection('people_count');

        const { startDate, endDate, limit = 50, skip = 0 } = req.query;

        // Build filter query
        let filter = {};
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) {
                filter.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.timestamp.$lte = new Date(endDate);
            }
        }

        const data = await collection
            .find(filter)
            .sort({ timestamp: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .toArray();

        const total = await collection.countDocuments(filter);

        res.json({
            total,
            count: data.length,
            skip: parseInt(skip),
            limit: parseInt(limit),
            data
        });
    } catch (error) {
        console.error('Error fetching filtered people count data:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

// Get aggregated statistics for people count
exports.getPeopleCountStats = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collection = db.collection('people_count');

        const { timeRange = 'all' } = req.query; // 'hour', 'day', 'week', 'month', 'all'

        let matchStage = {};
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

        const stats = await collection.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalInCount: { $sum: '$in_count' },
                    totalOutCount: { $sum: '$out_count' },
                    avgPeople: { $avg: '$total_people' },
                    maxPeople: { $max: '$total_people' },
                    minPeople: { $min: '$total_people' },
                    recordCount: { $sum: 1 }
                }
            }
        ]).toArray();

        res.json({
            timeRange,
            stats: stats.length > 0 ? stats[0] : {
                totalInCount: 0,
                totalOutCount: 0,
                avgPeople: 0,
                maxPeople: 0,
                minPeople: 0,
                recordCount: 0
            }
        });
    } catch (error) {
        console.error('Error fetching people count stats:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

// Get people count history (time series)
exports.getPeopleCountHistory = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collection = db.collection('people_count');

        const { limit = 100 } = req.query;

        const data = await collection
            .find({})
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .toArray();

        // Reverse to get chronological order
        const history = data.reverse();

        res.json({
            count: history.length,
            data: history.map(item => ({
                timestamp: item.timestamp,
                in_count: item.in_count,
                out_count: item.out_count,
                total_people: item.total_people,
                frame_number: item.frame_number
            }))
        });
    } catch (error) {
        console.error('Error fetching people count history:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};
