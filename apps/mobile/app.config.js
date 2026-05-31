module.exports = ({ config }) => ({
  ...config,
  extra: {
    apiUrl: process.env.API_URL ?? 'http://localhost:3001',
  },
})
