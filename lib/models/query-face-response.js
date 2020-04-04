function QueryFaceResponse({ results, errors }) {
  this.results = [];
  this.errors = [];
  if (Array.isArray(results)) this.results = results;
  if (Array.isArray(errors)) this.errors = errors;
  return [this.results, this.errors];
}

module.exports = QueryFaceResponse;
