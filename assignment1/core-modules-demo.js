const os = require('os');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');

// Setup: Ensure directory exists
const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

async function runDemo() {
  // OS module
  console.log('Platform:', os.platform());
  console.log('CPU:', os.cpus()[0].model);
  console.log('Total Memory:', os.totalmem());

  // Path module
  const joinedPath = path.join(sampleFilesDir, 'folder', 'file.txt');
  console.log('Joined path:', joinedPath);

  // fs.promises API
  const filePath = path.join(sampleFilesDir, 'demo.txt');
  try {
    await fsPromises.writeFile(filePath, 'Hello from fs.promises!');
    const data = await fsPromises.readFile(filePath, 'utf8');
    console.log('fs.promises read:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }

  // 4. Streams for Large Files
  const largeFilePath = path.join(sampleFilesDir, 'largefile.txt');
  
  // Create a large file
  const writeStream = fs.createWriteStream(largeFilePath);
  for (let i = 0; i < 100; i++) {
    writeStream.write(`This is line ${i} of a large file that we will read using streams.\n`);
  }
  writeStream.end();

  // ONLY start reading once the writing has finished
  writeStream.on('finish', () => {
    const readStream = fs.createReadStream(largeFilePath, { 
      encoding: 'utf8', 
      highWaterMark: 1024 
    });

    readStream.on('data', (chunk) => {
      console.log('Read chunk:', chunk.substring(0, 40));
    });

    readStream.on('end', () => {
      console.log('Finished reading large file with streams.');
    });
  });
}  

runDemo();