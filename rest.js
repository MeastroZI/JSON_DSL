var url = require('url');


const baseUri = "https://example.com/schema/customer"

const absoluteUri = url.resolve(baseUri ,baseUri)

console.log(absoluteUri)