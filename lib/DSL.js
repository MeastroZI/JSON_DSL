const _ = require('lodash');
const Ajv = require('ajv');
const url = require('url');

(function (collections) {
    collections(module.exports)
}(function (exports) {
    exports.Convert = function (transformRules, jsonDocs) {
        const jsonClone = getClone(jsonDocs)
        const TransformInstance = new Transform(transformRules, jsonClone)
        const TransformMethods = {
            "applytransformations": function () {
                return TransformInstance.applyTransformations.call(TransformInstance)
            },
            "analyseSchemaIds": function () {
                return TransformInstance.analyseSchemaIds.call(TransformInstance)
            }
        }
        return TransformMethods

    }

    function Transform(transformRules, jsonDocs) {
        this.transformRules = transformRules
        this.json = jsonDocs
        this.ajvInstance = new Ajv()
        this.uriStack = []

        // this object will have all the other schemas which have there own id and mapped with there specific object 
        this.schemasObjec = {}
    }


    Transform.prototype.analyseSchemaIds = function () {
        this.fetchIdSchemas(this.json, '');
        return this.schemasObjec;
    }

    Transform.prototype.fetchIdSchemas = function (obj, prevUri) {
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

        for (let key in obj) {
            this.fetchIdSchemas(obj[key], newUri);
        }
        return;
    }


    Transform.prototype.applyTransformations = function () {
        for (elm of this.transformRules) {
            const pathArray = getArrayOfPath(elm.path)
            this.recursiveTraversal(pathArray, 0, this.json, elm)
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
            }
        }

        else if (isRecursive) {
            for (const key in prevRef) {
                //in recursive no need to increase the index just iterate from the prevRef
                this.Controller(key, prevRef, rule)

                this.recursiveTraversal(path, index, prevRef[key], rule)
            }
        }

        else {
            this.Controller(specific, prevRef, rule)

            this.recursiveTraversal(path, index + 1, prevRef[specific], rule)
        }


        // poping the uri 
        if (haveIdFlag) {
            this.uriStack.pop()
        }
        return

    }


    Transform.prototype.Controller = function (target, parent, rule) {

        const condiOperArr = rule.condOperMapper

        for (const elm of condiOperArr) {
            if (this.checkConditions(elm.conditions, target, parent, null)) {
                this.performOprs(elm.operations, target, parent, null)
            }
        }

    }


    Transform.prototype.checkConditions = function (condis, target, parent, storageObj) {
        const _this_ = this
        if (!condis || condis.length == 0) {
            return true
        }
        for (const obj of condis) {
            let singleObjRes = true
            for (const key in obj) {

                const funReference = Transform.CondtionsObj[key]
                const mainPara = { keyPara: obj[key], storageObj: storageObj }
                if (!funReference.call(_this_, mainPara, target, parent)) {
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


    Transform.prototype.performOprs = function (oprs, target, parent, storageObj) {

        for (let key in oprs) {
            const functionrefer = Transform.OperationsObj[key]
            const mainPara = { keyPara: oprs[key], storageObj: storageObj }
            const response = functionrefer.call(this, mainPara, target, parent)
            if (!response.ack) {
                console.log(`Problems while performing operation ${key} ----> ERROR_MESSAGE: ${response.message} `)
            }
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

                        // this is for the features in which we want some conditions in which no updates occure, then in that case we can leave the getters property
                        if (elm.hasOwnProperty("getters")) {
                            StorageObj[key].current = this.gettersResolver(elm.getters, target, parent, StorageObj)
                        }
                        //only one updater is applied on true of the condtion
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
                    const getterResolverRef = this.getterResolver
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
                if (keyPara.hasOwnProperty("parent")) {
                    const result = this.gettersResolver(keyPara["parent"], target, parent, main["storageObj"])

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



        'editChildKey': function (main, target, parent) {
            const Targetsparent = parent[target]
            const keyPara = main.keyPara
            const response = { ask: true, message: "" }

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
                const newObj = _.omit(Targetsparent, [Targetkey])
                newObj[NewKey] = Targetsparent[Targetkey]
                parent[target] = newObj

            }
            else {
                response.ask = false
                response.message = "target key is not present in the parent"
                return response
            }

            return response

        },


        'valueIterator': function (main, target, parent) {

            const keyPara = main.keyPara
            const conditions = keyPara.conditions
            const operations = keyPara.operations
            const condtionCheckerRef = this.checkConditions
            const performOprsRef = this.performOprs


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

            if (condtionCheckerRef.call(this, conditions, target, parent, storageObj)) {
                performOprsRef.call(this, operations, target, parent, storageObj)
            }

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


        "hasSibling": function (mainPara, target, parent) {
            const key = this.gettersResolver(mainPara.keyPara.key, target, parent, mainPara["storageObj"])
            const value = this.gettersResolver(mainPara.keyPara.value, target, parent, mainPara["storageObj"])
            const from = (() => {
                if (mainPara.keyPara.hasOwnProperty("from")) {
                    const result = this.gettersResolver(mainPara.keyPara.from, target, parent, mainPara["storageObj"])
                    return result
                }
                return parent

            })()
            if (from.hasOwnProperty(key) && from[key] == value) {
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
        }
    }

    Transform.Getters = {

        "getReference": function (main, target, parent) {

            const keyPara = main.keyPara
            const uri = this.gettersResolver(keyPara.path, target, parent, main["storageObj"])
            //special condition if uri start with #.../ then in that case "from" url will be resolve from parent[target] 
            let fragment = uri
            const from = (() => {
                // if from is given then uri must be a fragment part #something/some...
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
                    // const rootUri = this.uriStack[this.uriStack.length - 1]
                    const absoluteUri = this.getAbsoluteUri(uri)
                    const parsedUrl = parseUri(absoluteUri)
                    const newRoot = `${parsedUrl.origin}${parsedUrl.pathname}`
                    const rootReference = this.schemasObjec[newRoot]
                    //updating the fragment and removing #
                    fragment = parsedUrl.hash.substring(1)
                    return rootReference
                }

            })()


            const arr = getArrayOfPath(fragment)

            let Targate_ = from

            for (elm of arr) {
                if (Targate_.hasOwnProperty(elm)) {
                    Targate_ = Targate_[elm]
                }
                else {
                    // path is wrong throw the warning
                    break
                }
            }

            return Targate_
        },
        // this method return the current Root URI
        "getCurrentRootUri": function (main, target, parent) {
            return this.uriStack[this.uriStack.length - 1]
        },

        // this method return the root URI by extracting it from given sting URI
        "getRootUri": function (main, target, parent) {
            const keyPara = main.keyPara
            const paramUri = this.gettersResolver(keyPara["uri"], target, parent, main["storageObj"])
            // const currentRoot = this.uriStack[this.uriStack.length - 1]

            const finalUri = this.getAbsoluteUri(paramUri)
            const parsedUri = parseUri(finalUri)
            const rootPath = `${parsedUri.origin}${parsedUri.pathname}`

            return rootPath
        },
        "getUriWithoutFragment": function (main, target, parent) {
            const keyPara = main.keyPara
            const uri = this.gettersResolver(keyPara["uri"], target, parent, main["storageObj"])
            const uriArr = uri.split('#')

            return uriArr[0].trim()
        },
        "getAbsoluteUri": function (main, target, parent) {
            const keyPara = main.keyPara
            const relativeUri = this.getterResolver(keyPara["realative"], target, parent, main["storageObj"])
            const baseUri = (() => {
                if (keyPara.base) {
                    return this.getterResolver(keyPara["base"], target, parent, main["storageObj"])
                }
                else {
                    return this.uriStack(this.uriStack.length - 1)
                }
            })()

            const absoluteUri = this.getAbsoluteUri(realative, baseUri)

            return absoluteUri

        },
        "getValue": function (main, target, parent) {
            return parent[target]
        },
        "getCurrentRoot": function (main, target, parent) {
            return this.uriStack[this.uriStack.length - 1]
        },
        "getFragmentUri": function (main, target, parent) {
            const keyPara = main.keyPara
            const uri = keyPara && keyPara.uri ? keyPara.uri : parent[target]
            const absUri = this.getAbsoluteUri(uri)
            const parsedUrl = parseUri(absUri)
            // removing # and /
            return parsedUrl.hash

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

            if (!main.storageObj || !main.storageObj.hasOwnProperty(storageName)) {
                //throw error storageName is not Avialable in the Storage
            }

            const storageValue = main.storageObj[storageName].current

            return storageValue

        }
    }




























    // ***********************************Utils***************************************

    Transform.prototype.getAbsoluteUri = function (relative, base) {
        const _base = base ? base : this.uriStack.length > 0 ? this.uriStack[this.uriStack.length - 1] : ""
        const _relative = relative ? relative : ""

        const absoluteUri = url.resolve(_base, _relative)
        return absoluteUri
    }

    function getArrayOfPath(path) {

        if (!path) {
            return ['*']
        }
        else {
            if (typeof path != 'string') {


                return
            }

            const arr = path.split('/')
            return arr
        }
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