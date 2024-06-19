const { Convert } = require("../lib/DSL")


const btn = document.getElementById("TransformBtn")
const resElm = document.getElementById("resultArea")

btn.addEventListener('click' , transformCode)

function transformCode() {
    let code1 = document.getElementById('codeArea1').value;
    let code2 = document.getElementById('codeArea2').value;

    let json1 = JSON.parse(code1)
    let json2 = JSON.parse(code2)

    const instance = Convert(json1)
    let result = instance.applytransformations(json2)

    resElm.value = JSON.stringify(result)
    alert('Code from Section 1: ' + code1 + '\nCode from Section 2: ' + code2);
    // Here you can add your transformation logic
}