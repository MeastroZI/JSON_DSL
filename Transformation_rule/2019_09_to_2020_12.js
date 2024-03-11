const {Convert} = require("../lib/DSL")



const transformRule = [
    {
        path: "*",
        condOperMapper: [
            //*****************************$ref Transformation********************************** */
            {
                conditions: [
                    { "isKey": { key: "$ref" }, "valuePattern": ".*\\/items\\/.*" } , 
                    { "isKey": { key: "$ref" }, "valuePattern": ".*\\/additionalItems\\/.*" }
                ],
                operations: {
                    "valueIterator": {
                        type: "string", splitBy: "/",
                        defineStorage: {
                            "prevReference": {
                                current: { getReference: { path: '/' } },
                                updater: [
                                    { conditions: [{ "isEqual": { value1: "#", value2: { getStorage: "_$value_" } } }], 
                                    getters: { getReference: { path: "#" } } },
                                    { getters: { getReference: { path: { getConcatinate: ['/', { getStorage: "_$value_" }] }, from: { getStorage: "prevReference" } } } }
                                ]
                            },
                            "path": {
                                current: "",
                                updater: [
                                    //***************condition for first root reference */
                                    {
                                        conditions: [{ "isEqual": { value1: "#", value2: { getStorage: "_$value_" } } }],
                                        getters: { getConcatinate: ['#'] }
                                    },
                                    // **************items ---- > prefixitems
                                    {
                                        conditions: [
                                            {
                                                "isEqual": { value1: "items", value2: { getStorage: "_$value_" } },
                                                "hasSibling": { key: "type", value: "array", from: { getReference: { path: { getStorage: "path" } } } }
                                            }],
                                        getters: { getConcatinate: [{ getStorage: "path" }, '/', "prefixItems"] }
                                    },
                                    // ***************additionalItems ---- > items
                                    {
                                        conditions : [{"isEqual" : {value1 : "additionalItems" , value2 : {getStorage : "_$value_"}} , "hasSibling" : {key:"type" , value : "array" , from :{getReference : {path : {getStorage : "path"}}}}}]
                                    },
                                    //******************Default conditions to append the value as it is  */
                                    { getters: { getConcatinate: [{ getStorage: "path" }, '/', { getStorage: "_$value_" }] } }

                                ]
                            }
                        },

                        operations: {
                            "updateValue": { value: { getStorage: "path" } }
                        }
                    }
                }
            },
            //*****************************$recursiveAnchor Tramsformation********************** */
            {
                conditions : [{"hasChild" : {childName : "$recursiveAnchor"}}],
                operations : {
                    "updateValue" : {key : "$recursiveAnchor" , parent : {getReference:{path : "/"}} , value : "node"},
                    "editChildKey" : {key : "$recursiveAnchor"  , newKey : "$dynamicAnchor"}
                }

            },
            /*********************************$recursiveRef Transformation********************* */
            {
                conditions : [{"hasChild" : {childName : "$recursiveRef"}}],
                operations : {
                    "updateValue" : {key : "$recursiveAnchor" , parent : {getReference:{path : "/"}} , value : "#node"},
                    "editChildKey" : {key : "$recursiveRef"  , newKey : "$dynamicRef"}
                }

            },
            //*****************************$schema Transformation *********************************/
            {
                conditions: [{ "isKey": { key: "$schema" } }],
                operations: { "updateValue": { value: "https://json-schema.org/draft/2020-12/schema" } }

            }
        ]

    }
]