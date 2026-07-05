const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'sample-files');
const filePath = path.join(dir, 'sample.txt');
const content = 'Hello, async world!';

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(filePath, content);

/**
 *  - Callback Pattern
 * Callback hell occurs when you nest multiple asynchronous operations,
 * making code hard to read and maintain (the "pyramid of doom").
 * 
 * Example of callback hell:
 * fs.readFile(file1, (err, data) => {
 *   fs.readFile(file2, (err, data) => {
 *     fs.readFile(file3, (err, data) => {
 *       // ... more nesting
 *     });
 *   });
 * });
 */
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return console.error(err);
    console.log('Callback read:', data);

    // Promise Pattern
    const readFilePromise = (path) => {
        return new Promise((resolve, reject) => {
            fs.readFile(path, 'utf8', (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    };

    readFilePromise(filePath)
        .then((data) => {
            console.log('Promise read:', data);

            // Async/Await Pattern
            async function runAsyncAwait() {
                try {
                    const data = await readFilePromise(filePath);
                    console.log('Async/Await read:', data);
                } catch (err) {
                    console.error('Error:', err.message);
                }
            }
            runAsyncAwait();
        })
        .catch((err) => console.error(err));
});
