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
    }
    Transform.prototype.applyTransformations = function (){
        for ( elm of this.transformRules){
            const pathArray = getArrayOfPath(elm.path)
            console.log(elm)
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
                console.log(key)
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
                console.log(key)
                this.Controller(key , prevRef , rule)

                this.recursiveTraversal(path, index, prevRef[key] , rule)
            }
        }

        else {
            console.log(specific)
            this.Controller(specific , prevRef , rule)
            
            this.recursiveTraversal(path, index + 1, prevRef[specific] , rule)
        }

    }
    Transform.prototype.Controller = function (target, parent , rule) {
        const conditions = rule.conditions

        if (this.checkConditions(conditions, target, parent)) {
            console.log("under1")
            if (rule.hasOwnProperty("referencTraverser") && rule.referencTraverser) {
                const arr = getArrayFromPath(parent[target])

                console.log("under2")

                const UpdateString = rule.updateRefPart

                const condis = rule.refConditions
                const result = fixRef(arr, RawJson, UpdateString, condis)
                if (result.Achnoweledgement) {
                    OperationsObj["updateValue"](result.pathStr, target, parent)
                }
                else {
                    console.log("warning : " + result.errMessage)
                }


            }
            else {
                this.performOprs(rule.operations, target, parent)
            }
        }


    }
    Transform.prototype.checkConditions = function (condis, target, parent) {
        if (!condis || condis.length == 0) {
            return true
        }
        for (obj of condis) {
            let singleObjRes = true
            for (key in obj) {

                const funReference = this.CondtionsObj[key]

                if (!funReference(obj[key], target, parent)) {
                    singleObjRes = false
                    break
                }
            }

            console.log(target)
            console.log(singleObjRes)
            if (singleObjRes) {
                console.log(singleObjRes)
                return true
            }


        };


        return false
    }
    Transform.prototype.performOprs = function (oprs, target, parent) {
        for (let key in oprs) {
            const functionrefer = this.OperationsObj[key]
            functionrefer(oprs[key], target, parent)
        }
    }

    Transform.prototype.OperationsObj = {
        'updateValue': function (newVal, target, parent) {
            if (!parent.hasOwnProperty(target)) {
                return false
            }
            parent[target] = newVal
            return true

        },
        'editKey': function (newVal, target, parent) {
            console.log("under the editKey**********")
            console.log(parent)
            if (!parent.hasOwnProperty(target)) {
                return false

            }
            parent[newVal] = parent[target]
            delete parent[target]
            return true
        }
    }
    Transform.prototype.CondtionsObj = {
        "isKey": function (mainPara, target, parent) {
            if (mainPara == target & parent.hasOwnProperty(mainPara)) {
                return true
            }
            return false
        },
        "hasSibling": function (mainPara, target, parent) {
    
            if (parent.hasOwnProperty(mainPara[0]) && parent[mainPara[0]] == mainPara[1]) {
                console.log("True from the hasSibling")
                return true
            }
            return false
        }
    }



   
























    // ***********************************Utils***************************************

    function getArrayOfPath(path) {

        if (!path) {
            return ['*']
        }
        else {

            const arr = path.split('/')
            return arr
        }
    }

    function getClone(json) {
        const clone = JSON.parse(JSON.stringify(json))

        return clone
    }
}))