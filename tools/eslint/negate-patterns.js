function negatePatterns(patterns) {
  return patterns.map((pattern) => `!${pattern}`);
}

module.exports = {
  negatePatterns,
};
