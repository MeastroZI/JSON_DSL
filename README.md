# **Json DSL**

## Working Explaination 

![Flowchart](./Static/Chart.png)


* **Recursive Traverser** :  As name suggest this method traverser from the json data according to the traverse method provided in the “Path” attribute in the rule 

* **Controller** : Controller is responsible for the checking of the condition and then call method for performing the operation on the part of the json at which condition get true

* **Operation Performer**  : This method is perform all the operation provided in the  rule on the target part of the json , it call the methods which are available in the “Operations methods” for performing the operations . 

* **Conditions Performer** : This method perform the conditions provided in the rule using the methods available  in the “Conditions methods”

* **Condition Methods** : This is the collection of the methods which have the return type of the boolean

* **Operation Methods** : This is the collection of the methods which have the return type of the json object which actually is the updated object 

* **Getters Methods** : After the condition method there is still need to one more collection of the methods which provide some other functionalities will be explain using the example in this Rough DOCS 😀
  
* **Getter Resolver** : This  method which resolves the getter method  if it is present in the json rules , each and every method call the getter resolver to resolve there parameters .

* **Storage** : In this DSL there is the functionality to creat variables which is get store in the same object and can be accessed by using the “getStorage” which is the one of the methods of the “Getters Methods” so that can be used in from any stage , currently i just made this feature for the “ValueIterator” which is one of the method of the Operation methods will be explain later.



## Syntax and Example


```js
 const transformRule = [
    {
        path: "*",
        condOperMapper: [
            {
                conditions: [{ "isKey": { key: "$schema" } }],
                operations: { "updateValue": { value: "https://json-schema.org/draft/2020-12/schema" } }

            }
        ]

    }
]
```

this is the one of example of the rule for DSL , in this <br>
* Rule must be the array in which each element represent the rule going to perform in that iteration which represent by ```path``` , new element in the array represent the new condition and operations on json data which perform with fresh new iteration on the json data
* Path represent the the way we want to traverse from the JSON "*" represent the recursive there are 2 more options "#" and specific path, will explain later 
* condOperMapper , elements  which represent the condtion and operation specific operation only perform when condtions get true
* Overall it change the value of the kye "$schema" to the "https://json-schema.org/draft/2020-12/schema"




## Transformation rule to update the `$ref`

```js
const condOperMapper = [{
   {
                conditions: [
                    { "isKey": { key: "$ref" }, "valuePattern": ".*\\bitems\\b.*" },
                    { "isKey": { key: "$ref" }, "valuePattern": ".*\\badditionalItems\\b.*" }
                ],
                operations: {
                    "valueIterator": {
                        targetValue: { getFragmentUri: null },
                        type: "string", splitBy: "/",
                        defineStorage: {
                            "path": {

                                current: { "getConcatinate": [{ "getUriWithoutFragment": { uri: { "getValue": null } } }, '#'] },
                                updater: [
                                    // items -------------------------> prefixItems
                                    {
                                        conditions: [
                                            {
                                                isEqual: { value1: "items", value2: { getStorage: "_$value_" } },
                                                not: {
                                                    condiArr: [
                                                        {
                                                            isEqual: { value1: { getStorage: "prevKey" }, value2: "properties" },
                                                            isEqual: { value1: { getStorage: "prevKey" }, value2: "$defs" }
                                                        }
                                                    ]
                                                },
                                                hasProperty: { key: "items", from: { getStorage: "prevReference" } }
                                            },

                                        ],
                                        getters: {
                                            getConcatinate: [{ getStorage: "path" }, "/prefixItems"]
                                        }
                                    },
                                    //additionalItmes -----------------> items
                                    {
                                        conditions: [
                                            {
                                                isEqual: { value1: "additionalItems", value2: { getStorage: "_$value_" } },
                                                not: {
                                                    condiArr: [
                                                        {
                                                            isEqual: { value1: { getStorage: "prevKey" }, value2: "properties" },
                                                            isEqual: { value1: { getStorage: "prevKey" }, value2: "$defs" }
                                                        }
                                                    ]
                                                },
                                                hasProperty: { key: "additionalItems", from: { getStorage: "prevReference" } }
                                            },

                                        ],
                                        getters: {
                                            getConcatinate: [{ getStorage: "path" }, "/items"]
                                        }
                                    },

                                    //----------------------default-----------------------------
                                    { getters: { getConcatinate: [{ getStorage: "path" }, '/', { getStorage: "_$value_" }] } }

                                ]
                            },
                            "prevReference": {
                                current: { getReference: { path: { getRootUri: { uri: { getValue: null } } } } },
                                updater: [
                                    { conditions: [{ "isEqual": { value1: "#", value2: { getStorage: "_$value_" } } }] },
                                    { getters: { getReference: { path: { getConcatinate: ['#/', { getStorage: "_$value_" }] }, from: { getStorage: "prevReference" } } } }
                                ]
                            },
                            "prevKey": {
                                updater: [
                                    { getters: { getStorage: "_$value_" } }
                                ]
                            }
                        },

                        operations: {
                            "updateValue": { value: { getStorage: "path" } }
                        }
                    }
                }
            }


```


```valueIterator``` is the one of the method from  ```OperationsMethod``` it iterate from the value of the key which filter from the <br> ```conditions: [{ "isKey": { key: "$ref" }, "valuePattern": ".*\\/items\\/.*" }]``` <br> condtions will filter out the element which have the key   ```$ref``` and its value follow the json schema pattern ```.*\\/items\\/.*```
<br> <br>
#### About Conditions Property : 
* Condtions is the array of the ```Condtion methods ```
* In condtions all the methods present in the same ```{ }``` somethign like this ```[{method1 , method2}]```will be performed with the *AND* operations between them , means if single methods get return false no next conditions is going to be check
* All the methods present in the difference `{ }`  something like this ```[{method1} , {method2}]``` then *OR* operations is  perform between all the condtions , means if single method return true no next condtions is going to be check

#### About Value Iterator : 
* It iterate from the value of type `string` , `array` and `object`
* `splitBy` is the property which is used for the string which is used to split the string form the specific char , if not given then value is iterate from the all characters of the string
* For `array` and `object`it iterate from noramlly from the element
* Value Iterator maintain the variable  `_$value_` and `_$key_`  which represent the current value and key of the iteration which can be accessed using the `getStorage` method which is the one of the method of the `Getters methods`
* `targetValue` is the value on which iteration is perform 
* `defineStorage` is the one of the property of the Value Iterator which is used to define the *Varaibles* , in  example *keys* are the name of the varaibels and *value* have the property which is used by the valueIterator to update the variables.
* `Current` is the property of the each of the defined variable it's value is used to set the initial value of the variable.
* `getReference` is the one of the methods of the `Getters method` which return the value/reference (if object) of the key , this is the main method which is responsible to solve the json pointers of the `Json Schema` will be explain in later in detail
* `updater` is the property which performed for every iteration to update the current value of the *variable* , it is the array of the object in each object 2 proeprties are there `condtion` and `getters` only one updater is performed (which is under the `getters` ) from the `updater` array on the satisfaction of its respective condtion.
* Finally `condtions` and `opertions` are the properties of the `valueiterator` which is use to perform final operation on the target which is filter from the first conditon (line 65 of above code ) when the `condtions` is satisfied ( we can leave this condtion if we want  uncondtional operation  )

#### About getReference method : 
* This method is use to resolve the ref pointers of the json schema and also provide to realtivly get the reference with respect to the current reference
* This method have 2 property `path` represent the uri or the path WRT to the current reference , In above example getReference is used in the current property of the *prevReference* variable in this we are using the chain of the getters method let start with in to out.
    - `getValue` method used to get the value of the current key value for which we are under this operation method in our case it is `$ref`
    - `getRootUri` this method give the root (absolute) uri without its fragment,  for the input uri in *uri* property , EX :  uri = "/something#/foo/some" this uri is resolve to "https://..../something" under the hood this method is use the base uri which is the nearest `$id` WRT to the target ($ref) to resolve the realtive uri
    - `getReference`  Now this method resolve the uri which get from the `getRootUri` method and return its reference, under the hood *JSON_DSL* maintian the obj which have all refernce map with there respective `$id` (or we can say full URI of them ) , id itself resolve from the previous id as the base uri . This obj is usefull to resolve the case like bunduled schema with difference IDs so in this type of case schemas referenced using the realtive URI , [example](https://json-schema.org/draft/2020-12/release-notes#embedded-schemas-and-bundling)

 
#### How this transformation rule transforming the $ref for JSON SCHEMA 2019 to 2020: 
* This rule iterate from the fragment of the $ref and like if https://.....#/some1/some2 then it iterate from the ["some1" , "some2"] and then it check the condtitions
    - For "items" and additionalItmes we check that if the prevKey variable which we define to maintain the previous key appear in the `$ref` value is not an `properties` and `$def`  [example](https://docs.google.com/document/d/13Pr-QSI8Dxb5MdlHdSjM70GWAZzyyFbJ7dfrETWOTJ0/edit#heading=h.awn2hv3pq6sh) , [exmple2](https://docs.google.com/document/d/13Pr-QSI8Dxb5MdlHdSjM70GWAZzyyFbJ7dfrETWOTJ0/edit#heading=h.um7ir9w76c0p)
    - Then if the condition get staisfied we update the path variable value using the `getConcatinate` method which concaticate the *path* variable previous value to the / prefixItems and assign it to the current of the path variable same for additionalItems
    
    - Now last  `getters` is for the default condtion in which we append the `_$value_` as it is in path.
* Preverference always maintain the reference to the previous fragment value and it is used in the condtion of the path variable
    - Its Update have 2 obj one is without `getters` and another is without `conditions` so first obj is just for the ignore the first case ( `_$value_` = "#" ) bcz in this case we dont waana do any thing
    - Now in second obj we always have to update the prevreference using the current _$value_ unconditionally. In this obj we are concatinating the #/ with the `_$value_` to get the reference of the current value WRT the `from` in which we are taking the previous value of prereference variable.
    - prevKey is another variable which maintain the previous key appear in the `$ref` value
 
  `Operation` finally perform the operation on the `$ref` by updating the its value to the `path` variable

   

## getReference 

- This method is used to get the value/reference(if Object) of the path given in the `path` attribute
- If path is startWith #.../ then path is resolve wth respect to the current element for which conditions is checking or operation is performing
- It have `from` property which is the object from where we need to get the path resolve , if `from` property is given then path must start with the '#'
- If `from` attibute is not given and even path is not start with '#.../' in that case getReference resolve the path using base URI ( nearest $id , $anchore or etc ) and that resolved path which is the full URI is searched on the OBJECT which is made in the analysis state of the DSL which have all the reference to the Object map with the uri where baseUri get change. 



