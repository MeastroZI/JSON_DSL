const _ = require('lodash');
const Ajv = require('ajv');
const url = require('url');

(function (collections) {
    collections(module.exports)
}(function (exports) {
    exports.Convert = function (jsonDocs) {
        const jsonClone = _.cloneDeep(jsonDocs)
        const TransformInstance = new Transform(jsonClone)
        const TransformMethods = {
            "applytransformations": function (transformRules) {
                return TransformInstance.applyTransformations.call(TransformInstance, transformRules)
            },
            "analyseSchemaIds": function () {
                return TransformInstance.analyseSchemaIds.call(TransformInstance)
            },
            "addJsonData" : function (jsonD){
                return TransformInstance.AddJsonData.call(TransformInstance , jsonD)
            }
        }
        return TransformMethods

    }

    function Transform(jsonDocs) {
        this.transformRules
        this.json = jsonDocs
        this.ajvInstance = new Ajv()
        this.uriStack = []
        this._walkers_ = null
        this.operationsArr = []

        // this object will have all the other schemas which have there own id and mapped with there specific object 
        this.schemasObjec = {}
        // this.jsonObj = {json : this.json}
        this.keyStack = []
    }

    Transform.prototype.AddJsonData = function (jsonD) { 
        this.json = _.cloneDeep(jsonD)
        // empting all the variables
        this.uriStack.length = 0
        this._walkers_ = null
        this.operationsArr.length = 0
        this.schemasObjec = {}
        this.keyStack.length = 0
    }
    Transform.prototype.analyseSchemaIds = function () {
        this.fetchIdSchemas(this.json, '');
        return this.schemasObjec;
    }

    Transform.prototype.fetchIdSchemas = function (obj, prevUri) {
        /* 
        1) In fetchIdSchemas we are fetching all the obj ref which have there relative uri WRT the current id (base Uri) or other uri and map them in obj schemasObjec with key of full URI and obj ref which they point

        2) Like ID use as the uri for there object in which it present and can be access from the ref with there uri  ----> "https://json-schema.org/draft-06/draft-wright-json-schema-01#rfc.section.9.2" 

        3) $anchor also use for adding the fragment ("#") WRT to he previous (base) URI ,currently this is not require for any transformation but may be in future
        */
        if (typeof obj != 'object') {
            return;
        }

        let newUri = prevUri;

        if (obj.hasOwnProperty('$id')) {
            const relativeUri = obj['$id'];
            const absoluteUri = this.getAbsoluteUri(relativeUri, prevUri);
            newUri = absoluteUri;
            this.schemasObjec[absoluteUri] = obj;
        }
        else if (obj.hasOwnProperty('$anchor')) {
            const realativeUri = "#" + obj["$anchor"]
            const absoluteUri = this.getAbsoluteUri(realativeUri, prevUri)
            newUri = absoluteUri
            this.schemasObjec[absoluteUri] = obj
        }

        for (let key in obj) {
            this.fetchIdSchemas(obj[key], newUri);
        }
        return;
    }


    Transform.prototype.applyTransformations = function (transformRule) {
        if (!this.json){
            // json data not found error
            return
        }
        this.transformRules = transformRule
        for (const rule of this.transformRules) {
            
            if (rule.path.hasOwnProperty("walkers")) { 
                const walkers = require(`../walkers/${rule.path.walkers}`)
                this._walkers_ = walkers
                this.walkersTraversal(this.json , rule)
            }
            else {
                const pathArray = rule.path ? getArrayOfPath(rule.path) : ['*']
                this.recursiveTraversal(pathArray, 0 , this.json, rule)
            }
            this.recursiveTraversal(this.json, rule)

            this.performOprs()
            console.log("performing the operations ")
            console.log(this.operationsArr.length)
            this.operationsArr.length = 0

        }


        return this.json
    }

    //prevRef  ----- >  parent
    Transform.prototype.recursiveTraversal = function (path, index, prevRef, rule) {


        if (index == path.length ||
            typeof prevRef != "object") {
            return
        }
        const isRecursive = path[index] == '*' ? true : false
        const isHashspef = path[index] == '#' ? true : false
        const isSpecific = !(isRecursive || isHashspef)
        const specific = isSpecific ? path[index] : null
        const haveIdFlag = prevRef.hasOwnProperty("$id")


        //pushing uri
        if (haveIdFlag) {
            const relative = prevRef["$id"]
            console.log(relative)
            // const baseUri = this.uriStack[this.uriStack.length - 1 ]
            const absoluteUri = this.getAbsoluteUri(relative)
            this.uriStack.push(absoluteUri)
        }

        if (isHashspef) {
            for (const key in prevRef) {
                this.keyStack.push(key)
                this.Controller(key, prevRef, rule)
                //  if path= " #/something " then recursion is go in only if the value of key have the "something" property
                if (prevRef[key].hasOwnProperty(path[index + 1])) {
                    this.recursiveTraversal(path, index + 1, prevRef[key], rule)
                }
                else if (path[index + 1] == '#') {
                    // if have 2 consicutive # then make the new path which have initial element of the key
                    const newPath = path.slice(index)
                    //replacing # with the key
                    newPath[0] = key
                    this.recursiveTraversal(newPath, 0, prevRef[key], rule)
                }
                this.keyStack.pop(key)

            }
        }

        else if (isRecursive) {
            for (const key in prevRef) {
                this.keyStack.push(key)
                //in recursive no need to increase the index just iterate from the prevRef
                this.Controller(key, prevRef, rule)
                this.recursiveTraversal(path, index, prevRef[key], rule)
                this.keyStack.pop(key)
            }
        }

        else {
            this.keyStack.push(specific)
            this.Controller(specific, prevRef, rule)
            if (!prevRef.hasOwnProperty(specific)){
                return
            }
            this.recursiveTraversal(path, index + 1, prevRef[specific], rule)
            this.keyStack.pop(specific)
        }


        // poping the uri 
        if (haveIdFlag) {
            this.uriStack.pop()
        }
        return

    }

    // only for json schema
    Transform.prototype.walkersTraversal = function (schema, rules) {
        if (schema == undefined) {
            return
        }

        const hasIdFlag = schema.hasOwnProperty("$id")
        //pushing uri in stack to track the current base URI of the schema 
        if (hasIdFlag) {
            const relative = schema["$id"]
            console.log(relative)
            console.log("pushed")
            // const baseUri = this.uriStack[this.uriStack.length - 1 ]
            const absoluteUri = this.getAbsoluteUri(relative)
            this.uriStack.push(absoluteUri)
        }

        for (const key in schema) {
            const type = this.getWalkerType(key, schema)
            this.Controller(key, schema, rules)

            if (type == "array") {
                for (const schemaKey in schema[key]) {
                    this.walkersTraversal(schema[key][schemaKey], rules)
                }
            }
            else if (type == "object") {
                for (const schemaKey in schema[key]) {
                    this.walkersTraversal(schema[key][schemaKey], rules)
                }
            }
            else if (type == "value") {
                this.walkersTraversal(schema[key], rules)
            }


        }


        // poping the uri ($id)
        if (hasIdFlag) {
            this.uriStack.pop()
        }
        return



    }

    Transform.prototype.getWalkerType = function (key, prevRef) {
        const walkerDetail = this._walkers_[key]
        if (!walkerDetail) {
            return undefined
        }
        if (Array.isArray(walkerDetail.type)) {
            for (const type of walkerDetail.type) {
                if (type == 'array' && Array.isArray(prevRef[key])) {
                    return "array"
                }
                else if (type == 'value' && !Array.isArray(prevRef[key]) && typeof prevRef[key] == "object") {
                    return 'value'
                }
                else if (type == 'object' && typeof prevRef[key] == 'object') {
                    return 'object'
                }
            }
        }
        else {
            return walkerDetail.type
        }
    }

    Transform.prototype.Controller = function (target, parent, rule) {

        const condiOperArr = rule.condOperMapper

        for (const elm of condiOperArr) {
            if (this.checkConditions.call(this, elm.conditions, target, parent)) {
                this.storeOperations.call(this, elm.operations, target, parent)
            }
        }

    }


    Transform.prototype.checkConditions = function (condis, target, parent, storageObj) {

        if (!condis || condis.length == 0) {
            return true
        }
        for (const obj of condis) {
            let singleObjRes = true
            for (const key in obj) {

                const funReference = Transform.CondtionsObj[key]
                const mainPara = { keyPara: obj[key], storageObj: storageObj }
                if (!funReference.call(this, mainPara, target, parent)) {
                    singleObjRes = false
                    break
                }
            }

            if (singleObjRes) {
                return true
            }


        };


        return false
    }

    Transform.prototype.storeOperations = function (oprs, target, parent, storageObj) {
        const _this_ = this
        for (let object of oprs) {
            //only one operations can be in one object 
            const key = Object.keys(object)[0]
            const functionrefer = Transform.OperationsObj[key]
            const parameters = [
                { keyPara: object[key], storageObj: storageObj },
                target,
                parent
            ]

            if (key != "valueIterator") {

                const resolvedKeyParaObject = (() => {
                    const _keyPara_ = object[key]

                    if (typeof _keyPara_ == 'string') {
                        return _keyPara_
                    }
                    const resolvedKeyPara = {}

                    for (const paras in _keyPara_) {
                        //resolving the keyparas of the operations 
                        resolvedKeyPara[paras] = this.gettersResolver(_keyPara_[paras], target, parent, storageObj)
                    }
                    return resolvedKeyPara
                })()

                parameters[0].keyPara = resolvedKeyParaObject
                _this_.operationsArr.push({ functionrefer: functionrefer, parameters: parameters })
                
            }
            else {
                functionrefer.call(_this_, ...parameters)
          
            }
        }

    }


    Transform.prototype.performOprs = function () {

        for (const operations of this.operationsArr) {
            const { functionrefer, parameters } = operations
            functionrefer.call(this, ...parameters)
        }
    }


    Transform.prototype.gettersResolver = function (getterObj, target, parent, storageObj) {
        if (typeof getterObj != 'object' ||
            !(getterObj.hasOwnProperty("getters") || Transform.Getters.hasOwnProperty(Object.keys(getterObj)[0]))
        ) {

            return getterObj
        }

        const obj = getterObj.hasOwnProperty("getters") ? getterObj["getters"] : getterObj
        const key = Object.keys(obj)[0]
        const funcReference = Transform.Getters[key]
        const result = funcReference.call(
            this,
            { keyPara: obj[key], storageObj: storageObj },
            target,
            parent,
        )

        return result
    }

    //currently this method is just used by the valueIterator but in future may be extended for global storage(variable)
    Transform.prototype.storageUpdater = function (target, parent, StorageObj) {

        for (const key in StorageObj) {
            if (StorageObj[key].hasOwnProperty("updater")) {
                const updaters = StorageObj[key]["updater"]
                for (let elm of updaters) {
                    if (this.checkConditions(elm.conditions, target, parent, StorageObj)) {

                        // StorageObj[key].current 
                        const result = this.gettersResolver(elm.getters, target, parent, StorageObj)

                        if (elm.opType  && elm.opType == "append") {
                           
                            const _key_ = StorageObj["_$key_"].current
                            if (typeof StorageObj[key]["current"] == "object"){
                                // for array and object
                                StorageObj[key]["current"][_key_] = result
                            }
                            else {
                                //string
                                StorageObj[key]["current"] = StorageObj[key]["current"] + result
                            }


                        }
                        else {
                            StorageObj[key].current  = result
                            // default is replace
                        }

                        //only one updater obj is applied , on true of the condtion
                        break

                    }

                }
            }
        }
    }


    Transform.OperationsObj = {


        'updateValue': function (main, target, parent) {
            const keyPara = main.keyPara
            const response = { ack: true, message: "" }
            const key = (() => {
                if (keyPara.hasOwnProperty("key")) {
                    const result = this.gettersResolver(keyPara["key"], target, parent, main["storageObj"])
                    //handle error for result's datatype
                    return result
                }
                return target
            })()

            //*************************error 
            if (typeof key != "string") {
                response.ack = false
                response.message = "type of key must be a string"
                return response
            }
            //*************************error */

            const parentRef = (() => {
                if (keyPara.hasOwnProperty("from")) {
                    const result = this.gettersResolver(keyPara["from"], target, parent, main["storageObj"])

                    return result
                }
                return parent

            })()

            //************************error 
            if (typeof parentRef != "object") {
                response.ack = false
                response.message = "type of parent must be a object"
                return response
            }
            //*************************error */


            //**************************error */
            if (!parentRef.hasOwnProperty(key)) {
                response.ack = false
                response.message = "target key is not present in the parent"
                return response
            }
            //**************************error */

            const newValue = this.gettersResolver(keyPara["value"], target, parent, main["storageObj"])
            parentRef[key] = newValue
            return response

        },

        "addProperty" : function (main, target, parent) {
            const keyPara = main.keyPara
            const value = keyPara.value
            const key = keyPara.key
            if (typeof parent[target] != 'object' && !Array.isArray(parent[target])) {
                parent[target] = {}
                
            }
            if (!Array.isArray(parent[target])) { 
                parent[target][key] = value
            }

        },
        "deletProperty" : function (main , target, parent) { 
            const keyPara = main.keyPara
            delete parent[keyPara]

        },
        'editChildKey': function (main, target, parent) {
            const Targetsparent = parent[target]
            const keyPara = main.keyPara
            const response = { ack: true, message: "" }

            const Targetkey = (() => {
                if (keyPara.hasOwnProperty('key')) {
                    const key = this.gettersResolver(keyPara['key'], target, parent, main['storageObj'])
                    return key
                }
                else {
                    // throw error
                    return undefined
                }
            })()


            //************************error 
            if (typeof Targetkey != "string") {
                response.ack = false
                response.message = "type of key must be a string"
                return response
            }
            //*************************error */


            const NewKey = (() => {
                if (keyPara.hasOwnProperty('newKey')) {
                    const key = this.gettersResolver(keyPara['newKey'], target, parent, main['storageObj'])
                    return key
                }
                else {
                    //throw error
                    return undefined
                }
            })()


            //************************error 
            if (typeof NewKey != "string") {
                response.ack = false
                response.message = "type of NewKey must be a string"
                return response
            }
            //*************************error */


            if (Targetsparent.hasOwnProperty(Targetkey)) {

                const newObj = _.mapKeys(Targetsparent, function (value, key) {
                    if (key == Targetkey) {
                        return NewKey
                    }
                    return key
                })

                parent[target] = newObj

            }
            else {
                response.ask = false
                response.message = "target key is not present in the parent"
                return response
            }

            return response

        },
        'editKey': function (main, target, parent) {
            const keyPara = main.keyPara
            // this is the new key
            const key = (() => {
                if (!keyPara.hasOwnProperty("key")) {

                }
                const result = this.gettersResolver(keyPara["key"], target, parent, main["storageObj"])
                //handle error for result datatype
                return result


            })()
            const parentRef = (() => {
                if (keyPara.hasOwnProperty("parent")) {
                    const result = this.gettersResolver(keyPara["parent"], target, parent, main["storageObj"])
                    //handle error for parent datatype
                    return result
                }
                return parent

            })()

            if (!parentRef.hasOwnProperty(target)) {
                //throw warning
                return false
            }
            // 
            parentRef[key] = parentRef[target]
            delete parentRef[target]



            return true

        },


        'valueIterator': function (main, target, parent) {
            const __this__ = this
            const keyPara = main.keyPara
            const conditions = keyPara.conditions
            const operations = keyPara.operations
            const condtionCheckerRef = this.checkConditions
            const storeOperationsMethod = this.storeOperations
            const response = { ack: true, message: "" }

            const storageObj = (() => {
                const Obj = { "_$key_": { "current": "" }, "_$value_": { "current": "" } }
                if (keyPara.hasOwnProperty("defineStorage")) {
                    const cloneDefineStorage = getClone(keyPara["defineStorage"])
                    for (const key in cloneDefineStorage) {
                        Obj[key] = cloneDefineStorage[key]
                        Obj[key].current = this.gettersResolver(Obj[key].current, target, parent, Obj)
                    }
                }
                return Obj
            })()


            const targetArray = (() => {
                // if parameter has "targetValue" then resolve it else parent[target] will be the targetValue
                const targetValue = keyPara.hasOwnProperty("targetValue") ?
                    this.gettersResolver(keyPara["targetValue"], target, parent, main["storageObj"]) :
                    parent[target]

                if (keyPara.type == "string" && keyPara.hasOwnProperty("splitBy")) {
                    return targetValue.split(keyPara["splitBy"])
                }
                else {
                    return targetValue
                }
            })()


            for (const [key, value] of Object.entries(targetArray)) {
                storageObj["_$key_"]["current"] = key
                storageObj["_$value_"]["current"] = value
                this.storageUpdater(target, parent, storageObj)

            }

            if (condtionCheckerRef.call(__this__, conditions, target, parent, storageObj)) {
                storeOperationsMethod.call(__this__, operations, target, parent, storageObj)
            }

            return response

        }
    }



    Transform.CondtionsObj = {

        "isKey": function (mainPara, target, parent) {
            const key = this.gettersResolver(mainPara.keyPara.key, target, parent, mainPara["storageObj"])
            // const response = {ack: true , message: ""}
            if (key === target && parent.hasOwnProperty(key)) {
                return true
            }
            return false
        },
        "isValidPath": function (mainPara, target, parent) {
            const keyPara = mainPara.keyPara
            const path = keyPara ? this.gettersResolver(keyPara, target, parent, mainPara["storageObj"]) : parent[target]
            let fragment = path
            const rootReference = (() => {
                const absoluteUri = this.getAbsoluteUri(path)
                const parsedUrl = parseUri(absoluteUri)
                const newRoot = `${parsedUrl.origin}${parsedUrl.pathname}`
                const _rootReference = this.schemasObjec[newRoot]

                fragment = parsedUrl.hash
                return _rootReference
            })()

            const pathArr = getArrayOfPath(fragment)

            let tempref = rootReference

            for (const key of pathArr) {
                if (!tempref.hasOwnProperty(key)) {
                    return false
                }
                tempref = tempref[key]
            }

            return true
        },
        "not": function (mainPara, target, parent) {
            const keyPara = mainPara.keyPara
            const conditionArray = keyPara

            const result = this.checkConditions(conditionArray, target, parent, mainPara["storageObj"])

            return !result
        },

        "isType": function (mainPara, target, parent) {
            const keyPara = mainPara.keyPara
            const __target = (() => {
                if (keyPara.hasOwnProperty("target")) {
                    const resolved_Target = this.gettersResolver(keyPara.from, target, parent, mainPara["storageObj"])
                    return resolved_Target
                }
                return target
            })()
            const from = (() => {
                if (keyPara.hasOwnProperty("from")) {
                    const resolved_From = this.gettersResolver(keyPara.from, target, parent, mainPara["storageObj"])
                    return resolved_From
                }
                return parent

            })()

            const type = keyPara.type

            if (typeof from[__target] == type) {
                return true
            }
            return false

        },
        "hasProperty": function (mainPara, target, parent) {
            const key = this.gettersResolver(mainPara.keyPara.key, target, parent, mainPara["storageObj"])
            const value = (() => {
                if (mainPara.hasOwnProperty("value")) {
                    const resolvedValue = this.gettersResolver(mainPara.keyPara.value, target, parent, mainPara["storageObj"])
                    return resolvedValue
                }
                return null

            })()

            const from = (() => {
                if (mainPara.keyPara.hasOwnProperty("from")) {
                    const result = this.gettersResolver(mainPara.keyPara.from, target, parent, mainPara["storageObj"])
                    return result
                }
                return parent

            })()
            if (from.hasOwnProperty(key) && (value == null || from[key] == value)) {
                return true
            }
            return false
        },

        "hasParent": function (mainPara, target, parent) {
            const parentName = mainPara.keyPara
            if (this.keyStack.length != 0 && parentName === this.keyStack[this.keyStack.length - 2]) {
                return true
            }
            return false

        },


        "hasChild": function (mainPara, target, parent) {
            const keyPara = mainPara["keyPara"]
            const childName = (() => {
                if (keyPara.hasOwnProperty("childName")) {
                    const child = this.gettersResolver(keyPara["childName"], target, parent, mainPara["storageObj"])
                    return child
                }
                else {
                    return undefined
                }
            })()

            if (childName && parent[target].hasOwnProperty(childName)) {
                return true
            }
            else {
                return false
            }
        },


        "valuePattern": function (mainPara, target, parent) {

            const expression = mainPara.keyPara
            const schema = {
                "type": "string",
                "pattern": expression
            };
            const data = parent[target]
            const valid = this.ajvInstance.validate(schema, data);
            return valid


        },


        "isEqual": function (mainPara, target, parent) {

            const keyPara = mainPara.keyPara
            const value1 = this.gettersResolver(keyPara.value1, target, parent, mainPara["storageObj"])
            const value2 = this.gettersResolver(keyPara.value2, target, parent, mainPara["storageObj"])

            if (value1 == value2) {

                return true
            }
            return false
        },

        "isValidatingSchema" : function (mainPara , target , parent) {
            const keyPara = mainPara.keyPara 
            const schema = keyPara.schema
            const value = parent[target]

            const result = this.ajvInstance.validate(schema , value)

            return result

        }
    }


    Transform.Getters = {

        // this method return the reference of the uri and if uri is relative then it resolve it according to the current root uri which is the same as the most recent ID for target's parent

        "getReference": function (main, target, parent) {

            const keyPara = main.keyPara
            const uri = this.gettersResolver(keyPara.path, target, parent, main["storageObj"])
            let fragment = uri
            //special condition if uri start with #.../ then in that case url will be resolve "from" parent[target] 

            const from = (() => {
                // if from is given then uri must be a fragment part #/something/some...
                if (keyPara.hasOwnProperty("from") && uri.startsWith('#')) {
                    fragment = fragment.substring(2)
                    return this.gettersResolver(keyPara.from, target, parent, main["storageObj"])
                }
                else if (uri.startsWith("#.../")) {
                    fragment = fragment.substring("#.../".length)
                    return parent[target]
                }
                else {
                    // else we will calculate it from uri

                    // this getAbsoluteUri is the one which is in pototype of the Transform not the "Getters" method
                    const absoluteUri = this.getAbsoluteUri(uri)
                    const parsedUrl = parseUri(absoluteUri)
                    const newRoot = `${parsedUrl.origin}${parsedUrl.pathname}`
                    const rootReference = this.schemasObjec[newRoot]
                    //updating the fragment and removing # and /
                    fragment = parsedUrl.hash.substring(2)
                    return rootReference
                }

            })()
            const arr = getArrayOfPath(fragment)
            let Targate_ = from ? from : {}

            for (elm of arr) {
                if (Targate_.hasOwnProperty(elm)) {
                    Targate_ = Targate_[elm]
                }
                else {
                    return false
                }
            }

            return Targate_
        },


        "getValue": function (main, target, parent) {
            return parent[target]
        },


        "getConcatinate": function (main, target, parent) {
            const arr = main.keyPara
            let resultStr = ""
            for (elm of arr) {
                if (typeof elm == "object") {
                    const temp = this.gettersResolver(elm, target, parent, main["storageObj"])
                    resultStr = resultStr + temp
                }

                else {
                    resultStr = resultStr + elm
                }
            }

            return resultStr
        },


        "getStorage": function (main, target, parent) {
            const storageName = main.keyPara
            const storageValue = main.storageObj[storageName].current

            return storageValue
        },



        /*********************************URI METHODS ****************************** */

        //this methods are use to perform operation on the ID's of the json schema 



        // this method return the current Root URI 
        "getCurrentRootUri": function (main, target, parent) {
            return this.uriStack[this.uriStack.length - 1]
        },

        // this method return the root (origin + path) URI by extracting and calculating it from given sting URI
        "getRootUri": function (main, target, parent) {
            const keyPara = main.keyPara
            const paramUri = this.gettersResolver(keyPara["uri"], target, parent, main["storageObj"])
            const baseUri = keyPara.hasOwnProperty("base") ? this.gettersResolver(keyPara["uri"], target, parent, main["storageObj"]) : null

            const finalUri = this.getAbsoluteUri(paramUri, baseUri)
            const parsedUri = parseUri(finalUri)
            const rootPath = `${parsedUri.origin}${parsedUri.pathname}`

            return rootPath
        },


        "getUriWithoutFragment": function (main, target, parent) {
            const keyPara = main.keyPara
            const uri = keyPara && keyPara.uri ? this.gettersResolver(keyPara["uri"], target, parent, main["storageObj"]) : parent[target]
            // const fullUri = this.getAbsoluteUri(uri , false)
            const uriArr = uri.split('#')
            return uriArr[0].trim()
        },

        // this method return the full (origin + path + fragment) uri by resolving it 
        "getAbsoluteUri": function (main, target, parent) {
            const keyPara = main.keyPara
            const relativeUri = this.gettersResolver(keyPara["relative"], target, parent, main["storageObj"])
            const baseUri = (() => {
                if (keyPara.base) {
                    return this.gettersResolver(keyPara["base"], target, parent, main["storageObj"])
                }
                else {
                    return this.uriStack[this.uriStack.length - 1]
                }
            })()

            const absoluteUri = this.getAbsoluteUri(relativeUri, baseUri)

            return absoluteUri

        },

        // this method return the fragement part of uri
        "getFragmentUri": function (main, target, parent) {
            const keyPara = main.keyPara
            const uri = keyPara && keyPara.uri ? keyPara.uri : parent[target]
            const absUri = this.getAbsoluteUri(uri)
            const parsedUrl = parseUri(absUri)
            // removing # and /
            const fragement = (() => {
                const temp = parsedUrl.hash
                if (temp.startsWith('#/')) {
                    return temp.slice(2)
                }
                if (temp.startsWith('#')) {
                    return temp.slice(1)
                }
                return temp
            })()
            return fragement

        },

    }







    // ***********************************Utils***************************************

    Transform.prototype.getAbsoluteUri = function (relative, base) {
        const _base = base ? base : this.uriStack.length > 0 ? this.uriStack[this.uriStack.length - 1] : ""
        const _relative = relative ? relative : ""

        try {
            const absoluteUri = url.resolve(_base, _relative)
            return absoluteUri

        }
        catch (error) {
            return _relative
        }

    }

    function getArrayOfPath(path) {
        if (path && typeof path == 'string') {
            if (path.startsWith('/')) {
                return path.slice(1).split('/')
            }
            if (path.startsWith('#/')) {
                return path.slice(2).split('/')
            }
            const arr = path.split('/')
            return arr
        }
        return [""]
    }

    function getClone(json) {
        const clone = JSON.parse(JSON.stringify(json))

        return clone
    }

    function parseUri(uri) {
        const parsedUrl = new URL(uri)
        return parsedUrl
    }
}))