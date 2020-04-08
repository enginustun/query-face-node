function QueryFaceResponse({ results = [], errors = [] }) {
  if (!Array.isArray(results) || !Array.isArray(errors)) {
    throw new Error('each results and errors spupplied must be an array.');
  }
  return [results, errors];
}

module.exports = QueryFaceResponse;
