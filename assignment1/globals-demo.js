console.log('__dirname:', __dirname);
console.log('__filename:', __filename);
console.log('Process ID:', process.pid);
console.log('Platform:', process.platform);

global.myCustomVar = 'Hello, global!';
console.log('Custom global variable:', global.myCustomVar);
