
const { Convert } = require("../lib/DSL")

// console.log(JSON.stringify(
//     [
//         {
//             path: "*",
//             condOperMapper: [
//                 {
//                     conditions: [{ "isKey": { key: "$schema" } }],
//                     operations: [{ "updateValue": { value: "https://json-schema.org/draft/2020-12/schema" } }]

//                 }
//             ]

//         }
//     ] , null , 2
//     ) )

// console.log(JSON.stringify(result, null, 3))

const defaultValue = {
    jsonData: {
        Name: "John_typo",
        Age: "19s",
        Proffesion: "Math",
    },
    transformRule: [
        {
            path: "*",
            condOperMapper: [

                {
                    conditions: [{ "isKey": { key: "Name" } }],
                    operations: [{ "updateValue": { value: "John Nash" } }]

                },
                {
                    conditions: [{ "isKey": { key: "Age" } }],
                    operations: [{ "updateValue": { value: 19 } }]

                },
                {
                    conditions: [{ "isKey": { key: "Proffesion" } }],
                    operations: [
                        { "updateValue": { "value": "Mathmatician" } },
                        { "editKey": { "key": "profession" } }
                    ]
                },
            ]
        }
    ]

}


const instance = Convert(defaultValue.jsonData)
const result = instance.applytransformations(defaultValue.transformRule)
console.log(JSON.stringify(result, null, 2))