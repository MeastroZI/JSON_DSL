const _ = require('lodash');
const Ajv = require('ajv');
const url = require('url');

(function (collections) {
    collections(module.exports)
}(function (exports) {
    exports.Convert = function (transformRules, jsonDocs) {
        const jsonClone = getClone(jsonDocs)
        const TransformInstance = new Transform(transformRules , jsonClone)
        const TransformMethods = {
            "applytransformations" : function(){
                return TransformInstance.applyTransformations.call(TransformInstance)
            }  ,
            "analyseSchemaIds" : function (){
                return TransformInstance.analyseSchemaIds.call(TransformInstance)
            }
        }
        return TransformMethods

    }

    function Transform(transformRules, jsonDocs) {
        this.transformRules = transformRules
        this.json = jsonDocs   
        this.ajvInstance = new  Ajv()
        this.uriStack = []

        // this object will have all the other schemas which have there own id and mapped with there specific object 
        this.schemasObjec = {}
    }
    Transform.prototype.analyseSchemaIds = function (){
        this.fetchIdSchemas(this.json, '');
       
        return this.schemasObjec;
     }
     
     Transform.prototype.fetchIdSchemas = function (obj, prevUri) {
         if (typeof obj != 'object'){
             return;
         }
     
         let newUri = prevUri;
     
         if (obj.hasOwnProperty('$id')) {
            console.log("got the id")
             const relativeUri = obj['$id'];
             const absoluteUri = getAbsoluteUri(prevUri, relativeUri);
             newUri = absoluteUri;
             this.schemasObjec[absoluteUri] = obj;
         }
         
         for (let key in obj) {
             this.fetchIdSchemas(obj[key], newUri);
         }
         return;
     }
    Transform.prototype.applyTransformations = function (){
        for ( elm of this.transformRules){
            const pathArray = getArrayOfPath(elm.path)
            this.recursiveTraversal(pathArray , 0 , this.json , elm)
        }

        return this.json
    }



    Transform.prototype.recursiveTraversal = function (path, index, prevRef , rule) {
    
        
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
            const baseUri = this.uriStack[this.uriStack.length - 1 ]
            const absoluteUri = getAbsoluteUri(baseUri , relative)
            this.uriStack.push(absoluteUri)
        }
        
        if (isHashspef) {
            for (const key in prevRef) {
                //   path= " #/something " will only called if the properties have the "something" property
                this.Controller(key , prevRef , rule)
                if (prevRef[key].hasOwnProperty(path[index + 1])) {
                    this.recursiveTraversal(path, index + 1, prevRef[key] , rule)
                }
                else if (path[index + 1] == '#') {
                    // if have 2 consicutive # then make the new path which have initial element of the key
                    const newPath = path.slice(index)
                    newPath[0] = key
                    this.recursiveTraversal(newPath, 0, prevRef[key], rule)
                }
            }
        }

        else if (isRecursive) {
            for (const key in prevRef) {
                //in recursive no need to increase the index just iterate from the prevRef
                this.Controller(key , prevRef , rule)

                this.recursiveTraversal(path, index, prevRef[key] , rule)
            }
        }

        else {
            this.Controller(specific , prevRef , rule)
            
            this.recursiveTraversal(path, index + 1, prevRef[specific] , rule)
        }


        // poping the uri 
        if (haveIdFlag){
            this.uriStack.pop()
        }
        return

    }
    Transform.prototype.Controller = function (target, parent , rule) {
        // const conditions = rule.conditions
        const condiOperArr = rule.condOperMapper

        for (elm of condiOperArr) {
            if (this.checkConditions(elm.conditions , target , parent , null)) {
                this.performOprs(elm.operations , target , parent, null)
            }
        }
      
    }
   
    Transform.prototype.checkConditions = function (condis, target, parent , storageObj) {
        
        // 
        const _this_ = this
        if (!condis || condis.length == 0) {
            return true
        }
        for (obj of condis) {
            let singleObjRes = true
            for (key in obj) {

                const funReference = Transform.CondtionsObj[key]
                const mainPara = {__this : _this_ , keyPara : obj[key] , storageObj : storageObj}
                if (!funReference.call(_this_ ,  mainPara, target, parent)) {
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
    Transform.prototype.performOprs = function (oprs, target, parent , storageObj) {
        
        for (let key in oprs) {
            const functionrefer = Transform.OperationsObj[key]
            const mainPara = {__this : this , keyPara : oprs[key] , storageObj : storageObj}
            functionrefer.call(this , mainPara, target, parent)
        }
    } 
    Transform.prototype.gettersResolver = function (getterObj , target , parent , storageObj) {
        
        
        if (typeof getterObj != 'object' ||    
            !(  getterObj.hasOwnProperty("getters") ||Transform.Getters.hasOwnProperty(Object.keys(getterObj)[0]))
            )
            {
                
                return getterObj
            }
        
        const obj =getterObj.hasOwnProperty("getters")?getterObj["getters"] : getterObj
        const key = Object.keys(obj)[0]
        
        const fucReference = Transform.Getters[key]

        const result = fucReference.call(
            this,
            {__this : this , keyPara : obj[key] , storageObj :storageObj},
            target ,
            parent ,
            )

        
        return result


    }
    Transform.prototype.storageUpdater = function (target , parent ,StorageObj ){
        
        for (const key in StorageObj) {
            if (StorageObj[key].hasOwnProperty("updater")){
                const updater = StorageObj[key]["updater"]
                for ( let elm of updater) {
                    if (this.checkConditions(elm.conditions , target , parent , StorageObj)) {
                        
                        StorageObj[key].current =this.gettersResolver(elm.getters , target , parent , StorageObj)
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
            const key =(()=>{
                if (keyPara.hasOwnProperty("key")) {
                    const getterResolverRef = this.getterResolver
                    const result = this.gettersResolver(keyPara["key"] , target , parent , main["storageObj"])
                    //handle error for result datatype
                    return result
                }
                return target
            })()
            const parentRef = (()=>{
                if (keyPara.hasOwnProperty("parent")) {
                    const result = this.gettersResolver(keyPara["parent"] , target , parent , main["storageObj"])
                    //handle error for parent datatype
                    return result
                }
                return parent
                
            })()
            
            const newValue = this.gettersResolver(keyPara["value"] , target , parent , main["storageObj"])
            if (!parentRef.hasOwnProperty(key)) {
                
                //throw warning_.omit(obj, 'b');
                return false
            }
            parentRef[key] =  newValue
            return true
            
        },
        'editKey': function (main, target, parent) {
            const keyPara = main.keyPara
            // this is the new key
            const key =(()=>{
                if (!keyPara.hasOwnProperty("key")) {
                    
                }
                const result = this.gettersResolver(keyPara["key"] , target , parent , main["storageObj"])
                //handle error for result datatype
                return result
                
                
            })()
            const parentRef = (()=>{
                if (keyPara.hasOwnProperty("parent")) {
                    const result = this.gettersResolver(keyPara["parent"] , target , parent , main["storageObj"])
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
        'editChildKey' : function (main , target , parent) {
            const Targetsparent =  parent[target]
            const keyPara = main.keyPara
            const Targetkey = (()=>{
                if (keyPara.hasOwnProperty ('key')) {
                    const key = this.getterResolver(keyPara['key'] , target , parent , main['storageObj'])
                    return key
                }
                else {
                    // throw error
                    return undefined
                }
            })()
            const NewKey = (()=>{
                if (keyPara.hasOwnProperty ('newKey')) {
                    const key = this.getterResolver(keyPara['newKey'] , target , parent , main['storageObj'])
                    return key

                }
                else {
                    //throw error
                    return undefined
                }
            })()

            if (Targetkey && NewKey && Targetsparent.hasOwnProperty(Targetkey)) {
                const newObj = _.omit(Targetsparent , [Targetkey])
                newObj[NewKey] = Targetsparent[Targetkey]
                parent[target] = newObj
                
            }
            else {
                //throw error
                return
            }

        },
        'valueIterator' : function (main , target , parent) {
            // const targetValue =main.type == "string" && main.hasOwnProperty('splitBy') ? parent[target]
            const keyPara = main.keyPara
            const storageObj = (()=>{
                const Obj = {"_$key_" : {"current":""} , "_$value_" : {"current":""} }
                if (keyPara.hasOwnProperty("defineStorage")) {
                    const cloneDefineStorage = getClone(keyPara["defineStorage"])
                    for (key in cloneDefineStorage) {
                        Obj[key] = cloneDefineStorage[key]
                        
                        Obj[key].current = this.gettersResolver(Obj[key].current , target , parent , Obj)
                        

                    }
                    // return Obj
                    
                }
                
                return Obj
            })()
            const targetArray = (()=>{
                if ( keyPara.type == "string" && keyPara.hasOwnProperty('splitBy') && typeof parent[target] == "string") {
                    return parent[target].split(keyPara["splitBy"])
                }
                else {
                    return parent[target]
                }
            })()
            
            const conditions = keyPara.conditions
            const operations = keyPara.operations
            const condtionCheckerRef = this.checkConditions
            const performOprsRef = this.performOprs
            for (const [key, value] of Object.entries(targetArray)) {
                storageObj["_$key_"]["current"] = key
                storageObj["_$value_"]["current"] = value
                this.storageUpdater(target , parent ,storageObj)
                
            }
            
            if (condtionCheckerRef.call( this , conditions,target , parent , storageObj)){
                performOprsRef.call( this , operations , target , parent ,storageObj)
            }
            
            

            
        }
    }
    Transform.CondtionsObj = {
        "isKey": function (mainPara, target, parent) {
            
            // )
            const key = this.gettersResolver( mainPara.keyPara.key , target , parent , mainPara["storageObj"])
            if (key == target & parent.hasOwnProperty(key)) {
                return true
            }
            return false
        },
        
        "hasSibling": function (mainPara, target, parent) {
            

            

            const key =  this.gettersResolver(mainPara.keyPara.key , target , parent , mainPara["storageObj"])
            const value = this.gettersResolver(mainPara.keyPara.value , target , parent , mainPara["storageObj"])
            const from = (()=>{
                if (mainPara.keyPara.hasOwnProperty("from")){
                    const result = this.gettersResolver(mainPara.keyPara.from , target , parent , mainPara["storageObj"])
                    return result
                }
                return parent

            })()
            if (from.hasOwnProperty(key) && from[key] == value) {
                return true
            }
            return false
        },
        "hasChild" :function (mainPara , target , parent){
            const keyPara = mainPara["keyPara"]
            const childName = (()=>{
                if (keyPara.hasOwnProperty ("childName")) {
                    const child = this.getterResolver (keyPara["childName"] , target , parent , mainPara["storageObj"])
                    return child
                }
                else {
                    //throw error childName is not given
                    return undefined
                }

            })()

            if (childName &&  parent[target].hasOwnProperty(childName)) {
                return true
            }
            else {
                return false
            }
        },
        "valuePattern" : function (mainPara , target , parent) {

            const expression = mainPara.keyPara
            const schema = {
                "type": "string",
                "pattern": expression
            };
            const data = parent[target]

            const valid =this.ajvInstance.validate(schema, data);
            return valid


        },
        "isEqual" : function (mainPara , target , parent){
            
            const keyPara = mainPara.keyPara
            const value1 = this.gettersResolver (keyPara.value1 , target , parent , mainPara["storageObj"])
            const value2 = this.gettersResolver(keyPara.value2, target , parent , mainPara["storageObj"])
            
            if (value1 == value2 ) {
                
                return true
            }
            return false
         }
    }

    Transform.Getters = {
        
        "getReference" : function (main , target , parent) {

            const keyPara = main.keyPara
            const uri = this.getterResolver(keyPara.path , target , parent , main["storageObj"])
            const rootUri = this.uriStack[this.uriStack.length - 1]
            // this method is not the Getter method this is the method  of the utils, present in the last line of this file
            const absoluteUri = this.getAbsoultUri(rootUri , uri)
            const parsedUrl = this.parseUri(absoluteUri)
            const newRoot = `${parsedUrl.origin}${parsedUrl.pathname}`
            const fragment = `${parsedUrl.hash}`
            const rootReference = this.schemasObjec[newRoot]
            
            const arr = this.getArrayOfPath(fragment).slice(1)

            const target = rootReference

            for (elm in arr){
                if (target.hasOwnProperty(elm)) {
                    target = target[elm]
                }
                else {
                    break
                }
            }

            return target
        },
        "getAbsoluteUri" :function(main , target , parent){
            const keyPara = main.keyPara
            const relativeUri = this.getterResolver(keyPara["realative"] ,target , parent , main["storageObj"])
            const baseUri =  (()=>{
                if (keyPara.base){
                    return this.getterResolver(keyPara["base"] , target , parent , main["storageObj"])
                }
                else {
                    return this.uriStack(this.uriStack.length - 1)
                }
            }) ()   

            const absoluteUri = url.resolve( baseUri,relativeUri )

            return absoluteUri

        },
        "getCurrentRoot" : function (main , target , parent){
            return this.uriStack[this.uriStack.length - 1]
        },
    
        "getConcatinate" : function (main , target , parent) {
            const arr = main.keyPara
            let resultStr = ""
            for (elm of arr ) {
                if (typeof elm == "object" ) {
                    const temp = this.gettersResolver(elm , target , parent , main["storageObj"])
                    resultStr = resultStr + temp
                }
                else {
                    resultStr = resultStr + elm
                }
            }

            return resultStr
        },
        "getStorage" : function (main , target , parent){
            const storageName = main.keyPara

            if (!main.storageObj  ||  !main.storageObj.hasOwnProperty(storageName)) {
                //throw error storageName is not Avialable in the Storage
            }

            const storageValue = main.storageObj[storageName].current 

            return storageValue

        }
    }



   
























    // ***********************************Utils***************************************

    function getArrayOfPath(path) {

        if (!path) {
            return ['*']
        }
        else {
            if ( typeof path != 'string') {
                
                
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

    function getAbsoluteUri (base  , relative) {
        const absoluteUri = url.resolve(base , relative)
        return absoluteUri
    }
    function parseUri (uri){
        const parsedUrl = new URL (uri)
        return parseUri
    }
}))