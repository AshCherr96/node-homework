# Node.js Fundamentals

## What is Node.js?
Node.js is a runtime environment that allows JavaScript to be executed on a user's computer or a server that is outside of the browser's sandbox. Google's V8 engine is used to translate JavaScript into machine code, enabling server-side capabilities like network management, operation system interaction, and file system access. 

## How does Node.js differ from running JavaScript in the browser?
Node.js focuses on backend tasks such as file system, server creation, environment variables, and OS services. JavaScript primarily controls webpage interactivity that includes DOM, window, document, and cookies. Node can also store secrets as it runs on a server whereas JavaScript shouldn't store secrets as the frontend code can be viewed.

## What is the V8 engine, and how does Node use it?
The V8 engine is a high-performance JavaScript engine built by Google for the Chrome browser. Node uses it by taking it out of the browser and it wraps extra abilites around it such as file and network access. 

## What are some key use cases for Node.js?
Use cases for Node.js includes building backend for web apps such as handling many concurrent connections like API's that need to serve data quickly to frontend frameworks. Node is also used to build robust CLI's to automate repetitive tasks or interacting with OS services directly from the terminal. Another key use case is to build tools and scripts such as  Vite and npm scripts to process and package files for the browser. 

## Explain the difference between CommonJS and ES Modules. Give a code example of each.
CommonJS modules are synchronous (load on demand) whereas ES Modules are asynchronous (static, load at startup). CommonJS modules blocks code while the module is being imported, and ES modules resolves the imports before the code executes as they must be at the top level of the file.

**CommonJS (default in Node.js):**
```js
// mathUtils.js
const add = (a, b) => a + b;
module.exports = { add };

// app.js
const { add } = require('./mathUtils');
console.log(add(2, 3));
```

**ES Modules (supported in modern Node.js):**
```js
// mathUtils.js
export const add = (a, b) => a + b;

// app.js
import { add } from './mathUtils.js';
console.log(add(2, 3));
``` 