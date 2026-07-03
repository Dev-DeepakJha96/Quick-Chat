const User = require('../models/User');
const asyncHandler = require('../utils/asyncHanlder');
const ApiResponse = require('../utils/ApiResponse');

exports.searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(200).json(ApiResponse.success({ users: [] }));
  }

  const users = await User.find({
    _id: { $ne: req.user._id },
    isActive: true,
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ],
  })
    .select('username email avatarColor')
    .limit(20);

  res.status(200).json(ApiResponse.success({ users }));
});
