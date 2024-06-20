// const { Convert } = require("../lib/DSL")
import { Convert } from '../lib/DSL';
import './index.css';
const btn = document.getElementById("TransformBtn")
const formateBtn = document.getElementById("Formate")
const resElm = document.getElementById("resultArea")
const codeArea1 = document.getElementById('codeArea1')
const codeArea2 = document.getElementById('codeArea2')
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

codeArea1.value = JSON.stringify(defaultValue.jsonData, null, 2)
codeArea2.value = JSON.stringify(defaultValue.transformRule, null, 2)
btn.addEventListener('click', transformCode)
formateBtn.addEventListener('click', formate)



function formate() {
    let json1 = JSON.parse(codeArea1.value)
    let json2 = JSON.parse(codeArea2.value)
    codeArea1.value = JSON.stringify(json1, null, 2)
    codeArea2.value = JSON.stringify(json2, null, 2)
}


function transformCode() {
    let code1 = codeArea1.value;
    let code2 = codeArea2.value;
    let json1, json2
    try {
        json1 = JSON.parse(code1)
        json2 = JSON.parse(code2)
        console.log(json1)

        const instance = Convert(json1)
        let result = instance.applytransformations(json2)
        console.log(result)
        resElm.value = JSON.stringify(result, null, 2)

    }
    catch (err) {
        console.log(err)
        alert("JSON is not correct")
    }
}


// const instance = Convert({"$schema" : "ass"})
let result = [
    {
        path: "*",
        condOperMapper: [
            {
                conditions: [{ "isKey": { key: "$schema" } }],
                operations: [{ "updateValue": { value: "https://json-schema.org/draft/2020-12/schema" } }]

            }
        ]

    }
]


// console.log(result)
