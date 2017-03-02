module.exports = {
  backup:{
    stdout: true,
    stderr: true,
    socket: true,
    script: './scripts/backup.js'
  },
  firebase:{
    stdout: true,
    stderr: true,
    socket: true,
    databaseURL: 'http://someurl.com',
    serviceKey: './admin.json',
    workspace: './DB',
    use: 'json',
    script: './scripts/firebase-client.js'
  }
}
