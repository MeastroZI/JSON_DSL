
const Ajv = require('ajv');

(function (collections) {
    collections(module.exports)
}(function (exports) {
    exports.Convert = function (transformRules, jsonDocs) {
        const jsonClone = getClone(jsonDocs)
        return new Transform(transformRules , jsonClone).applyTransformations()

    }

    function Transform(transformRules, jsonDocs) {
        this.transformRules = transformRules
        this.json = jsonDocs   
        this.ajvInstance = new  Ajv()
    }
    Transform.prototype.applyTransformations = function (){
        for ( elm of this.transformRules){
            const pathArray = getArrayOfPath(elm.path)
            this.recursiveTraversal(pathArray , 0 , this.json , elm)
        }

        return this.json
    }

    Transform.prototype.recursiveTraversal = function (path, index, prevRef , rule) {
    
        //prevRef  --- > parent 
        if (index == path.length ||
            typeof prevRef != "object") {
            return
        }
        const isRecursive = path[index] == '*' ? true : false
        const isHashspef = path[index] == '#' ? true : false
        const isSpecific = !(isRecursive || isHashspef)
        const specific = isSpecific ? path[index] : null
        
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
            // this is path either realtive (start with /) to current target or the from the root (start with #) and for sibling path must start with the . and to get the parent of the target path will be "."
            
            const keyPara = main.keyPara
            
            const arr = (()=>{
                const path = this.gettersResolver (keyPara.path , target , parent , main["storageObj"])
                const result = getArrayOfPath(path)
                return result

            })()
            
            
            const from  = (() => {
                if (arr[0] == '') {
                    //have custom from 
                    if (keyPara.hasOwnProperty("from") && keyPara["from"]) {
                        const customTarget = this.gettersResolver(keyPara["from"] , target , parent , main["storageObj"])
                        
                        return customTarget
                    }
                    return parent[target]
                }
                else if (arr[0] == '#'){
                    return this.json
                }
                else if (arr[0] == '.'){
                    return parent
                }
            } )()
            
            let targetRef = from
            for (let i = 1 ; i < arr.length ; i++) {
                if (targetRef.hasOwnProperty(arr[i])) { 
                    
                    targetRef = targetRef[arr[i]]
                }
                else {
                   
                    break 

                }
            }
            
            
            return targetRef
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
}))