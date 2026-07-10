const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

exports.searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(200).json(ApiResponse.success({ users: [] }));
  }

  // Escape special regex characters to prevent ReDoS, and lowercase query since fields are stored lowercased
  const queryLower = q.toLowerCase();
  const escapedQuery = escapeRegex(queryLower);

  const users = await User.find({
    _id: { $ne: req.user._id },
    isActive: true,
    $or: [
      { username: { $regex: '^' + escapedQuery } },
      { email: { $regex: '^' + escapedQuery } },
    ],
  })
    .select('username email avatarColor avatar')
    .limit(20);

  res.status(200).json(ApiResponse.success({ users }));
});
