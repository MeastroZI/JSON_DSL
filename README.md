# **Json DSL**

JSON_DSL is the json based DSL which provide the condition base transformation of the json data . JSON_DSL store  each of operation which is going to performed on json DATA in array when there specific conditions is get satisfied and in last all the operation is performed on the json DATA. Currently, I am using recursion, which may have some side effects. However, I am confident that I can mitigate them using asynchronous programming.

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
* Transformation rule must be the array in which each element represent the rule going to perform in that iteration which represent by ```path``` , new element in the array represent the new condition and operations on json data which perform with fresh new iteration on the json data
* Path represent the the way we want to traverse from the JSON "*" represent the recursive there are 2 more options "#" and specific path, will explain later 
* condOperMapper , elements  which represent the condtion and operation specific operation only perform when condtions get true
* Overall it change the value of the kye "$schema" to the "https://json-schema.org/draft/2020-12/schema"
  
In this path represent the target where we want to do the transformation , path can be of 3 type 
* specific :  in this type we provide the specific path where we want to perform the transformation EX : "something/something2"
* hashSpef (#) : this type is use to perform the transformation rule on the only on the one level of json data (no recursion ) EX : "something/something2/#" this path is perform the operation on the something2 object (no recursion just on the root level )
* recursive (\*) :  this type is use to perform the transfromation rule recursivly EX : path : "\*" apply the rule on whole json recursivly ,  path : "something/something2/*" this will apply the transformation rule on the something2 recursivly
* Walkers : JSON_DSL have type to  traverse from the json scheam just for temparory purpose ( for qulification Task ) using the walkers provided in the [alterschema](https://github.com/sourcemeta/alterschema) .  




## Transformation rule to update the `$ref`

this is the transformation rule for the transition of  2019-09 to 2020-12


```json
[
  {
    "path": { "walkers": "jsonschema-2019-09" },
    "condOperMapper": [
      {
        "conditions": [
          { "isKey": { "key": "$recursiveAnchor" } }
        ],
        "operations": {
          "updateValue": {
            "value": "anchor"
          },
          "editKey": {
            "key": "$dynamicAnchor"
          }
        }
      },
      {
        "conditions": [
          { "isKey": { "key": "$recursiveRef" } }
        ],
        "operations": {
          "updateValue": {
            "value": "#anchor"
          },
          "editKey": {
            "key": "$dynamicRef"
          }
        }
      },
      {
        "conditions": [
          { "isKey": { "key": "items" } }
        ],
        "operations": {
          "editKey": {
            "key": "prefixItems"
          }
        }
      },
      {
        "conditions": [
          { "isKey": { "key": "additionalItems" } }
        ],
        "operations": {
          "editKey": {
            "key": "items"
          }
        }
      },
      {
        "conditions": [
          { "isKey": { "key": "$schema" } }
        ],
        "operations": {
          "updateValue": {
            "value": "https://json-schema.org/draft/2020-12/schema"
          }
        }
      }
    ]
  },
  {
    "path": { "walkers": "jsonschema-2020-12" },
    "condOperMapper": [
      {
        "conditions": [
          { "isKey": { "key": "$ref" }, "valuePattern": ".*\\bitems\\b.*" },
          { "isKey": { "key": "$ref" }, "valuePattern": ".*\\badditionalItems\\b.*" }
        ],
        "operations": {
          "valueIterator": {
            "targetValue": { "getFragmentUri": null },
            "type": "string",
            "splitBy": "/",
            "defineStorage": {
              "path": {
                "current": { "getConcatinate": [{ "getUriWithoutFragment": null }, "#"] },
                "updater": [
                  {
                    "conditions": [
                      { "isEqual": { "value1": "items", "value2": { "getStorage": "_$value_" } } },
                      { "isValidPath": { "getConcatinate": [{ "getStorage": "path" }, "/", "prefixItems"] } }
                    ],
                    "getters": {
                      "getConcatinate": [{ "getStorage": "path" }, "/prefixItems"]
                    }
                  },
                  {
                    "conditions": [
                      { "isEqual": { "value1": "additionalItems", "value2": { "getStorage": "_$value_" } } },
                      { "isValidPath": { "getConcatinate": [{ "getStorage": "path" }, "/", "items"] } }
                    ],
                    "getters": {
                      "getConcatinate": [{ "getStorage": "path" }, "/items"]
                    }
                  },
                  { "getters": { "getConcatinate": [{ "getStorage": "path" }, "/", { "getStorage": "_$value_" }] } }
                ]
              }
            },
            "operations": {
              "updateValue": { "value": { "getStorage": "path" } }
            }
          }
        }
      }
    ]
  }
]


```
In this rule there are 2 transformation object in array first for the tranformation of all the 2019 keywords to the specific keyword of 2020 draft in which jsonschema is iterate using the walkers "jsonschema-2019-09" and 2nd transformation object is for the transformation of the `$ref` on the bases of the updated keyword in which json scheam is iterate using the walekrs "jsonschema-2020-12" (as accept $ref whole schema is transform into the 2020-12 draft).
Each tranformation object in array is performed with the different iteration on the JSON data and next transformation object is perfomred after the all the operations of the previous transformation object is performed on the json data 



NOTE : Empty `conditions` array or not provided `conditions` is resolve to the True , so this DSL can be used as the normal DSL like json merge and json patch . For the conditions of json schema Transformation we can use the AJV as done in the [alterschema](https://github.com/sourcemeta/alterschema).



```valueIterator``` is the one of the method from  ```OperationsMethod``` it iterate from the value of the key which filter from the <br> ```conditions: [{ "isKey": { key: "$ref" }, "valuePattern": ".*\\/items\\/.*" }]``` <br> condtions will filter out the element which have the key   ```$ref``` and its value follow the json schema pattern ```.*\\/items\\/.*```
<br> <br>
### About Conditions Property : 
* Condtions is the array of the ```Condtion methods ```
* In condtions all the methods present in the same ```{ }``` somethign like this ```[{method1 , method2}]```will be performed with the *AND* operations between them , means if single methods get return false no next conditions is going to be check
* All the methods present in the difference `{ }`  something like this ```[{method1} , {method2}]``` then *OR* operations is  perform between all the condtions , means if single method return true no next condtions is going to be check

### About `ValueIterator` : 
* It iterate from the value of type `string` , `array` and `object`
* `splitBy` is the property which is used for the string which is used to split the string form the specific char , if not given then value is iterate from the all characters of the string
* For `array` and `object`it iterate from noramlly from the element
* Value Iterator maintain the variable  `_$value_` and `_$key_`  which represent the current value and key of the iteration which can be accessed using the `getStorage` method which is the one of the method of the `Getters methods`
* `targetValue` is the value on which iteration is perform 
* `defineStorage` is the one of the property of the Value Iterator which is used to define the *Varaibles* , in  example *keys* are the name of the varaibels and *value* have the property which is used by the valueIterator to update the variables.
* `Current` is the property of the each of the defined variable it's value is used to set the initial value of the variable.
* `updater` is the property which performed for every iteration to update the current value of the *variable* , it is the array of the object in each object 2 proeprties are there `condtion` and `getters` only one updater is performed (which is under the `getters` ) from the `updater` array on the satisfaction of its respective condtion.
* Finally `condtions` and `opertions` are the properties of the `valueiterator` which is use to perform final operation on the target which is filter from the first conditon (line 65 of above code ) when the `condtions` is satisfied ( we can leave this condtion if we want  uncondtional operation  )

### About getReference method : 
* This method is use to resolve the ref pointers of the json schema and also provide to realtivly get the reference with respect to the current reference
* This method have 2 property `path` represent the uri or the path WRT to the current reference , In above example getReference is used in the current property of the *prevReference* variable in this we are using the chain of the getters method let start with in to out.
    - `getValue` method used to get the value of the current key value for which we are under this operation method in our case it is `$ref`
    - `getRootUri` this method give the root (absolute) uri without its fragment,  for the input uri in *uri* property , EX :  uri = "/something#/foo/some" this uri is resolve to "https://..../something" under the hood this method is use the base uri which is the nearest `$id` WRT to the target ($ref) to resolve the realtive uri
    - `getReference`  Now this method resolve the uri which get from the `getRootUri` method and return its reference, under the hood *JSON_DSL* maintian the obj which have all refernce map with there respective `$id` (or we can say full URI of them ) , id itself resolve from the previous id as the base uri . This obj is usefull to resolve the case like bunduled schema with difference IDs so in this type of case schemas referenced using the realtive URI , [example](https://json-schema.org/draft/2020-12/release-notes#embedded-schemas-and-bundling)

### About other methods : 
* isValidPath : this is the condition method which check weather the path provided is valid or not (can be resolved or not )
* isEqual : this is the condition method which check weather the value1 and value2 is equal or not
* getCocatinate : this is the getters method which concatinate all the value provided in the array by resolvoing it .
 
### How this transformation rule transforming the $ref for JSON SCHEMA 2019 to 2020: 

this are the updaters of the path variable which update the path variable 

------------------------------item to prefixItems----------------------------------------

```json
{
    "conditions": [
      { "isEqual": { "value1": "items", "value2": { "getStorage": "_$value_" } } },
      { "isValidPath": { "getConcatinate": [{ "getStorage": "path" }, "/", "prefixItems"] } }
    ],
    "getters": {
      "getConcatinate": [{ "getStorage": "path" }, "/prefixItems"]
    }
  },
```

-------------------------------additionalItems to items ----------------------------------

```json
{
    "conditions": [
      { "isEqual": { "value1": "additionalItems", "value2": { "getStorage": "_$value_" } } },
      { "isValidPath": { "getConcatinate": [{ "getStorage": "path" }, "/", "items"] } }
    ],
    "getters": {
      "getConcatinate": [{ "getStorage": "path" }, "/items"]
    }
  },
```

---------------------------------Defult-----------------------------------------------------

```json
     {
    "getters": {
      "getConcatinate": [{ "getStorage": "path" }, "/", { "getStorage": "_$value_" }]
    }
  }
```

In the rule for the items to prefixItems ,we are cheking 2 conditions first `isEqual` check weather `_$value_` variable is equal to the items or not and 2nd conditions `isValidPath` check weather the path provided is valid or not ( can be resolved or not ) 

`isValidPath` have the value of getters method which resolve in this way 
* first `getStorage` method get the value of the `path`
* then `getConcatinate` method concatinate the `path` value with the "/" and "prefixItems" (as keyword is alredy transform into the 2020 draft specific )
* then the resolved path is checked by `isValidPath` weather the path is valid or not

when the conditions get satisfied `getters` property update the value of path by resolving this 
```json "getConcatinate": [{ "getStorage": "path" }, "/items"] ```

Last object is the conditionLess getters which perform for the keys which not require to chagne and for which no other update is perfomred .

In last `Operation` perform the operation on the `$ref` by updating  its value to the `path` variable


IN summery : we are checking weather the $ref path is valid or not and then change the path according to it

### How isValidPath is working 

There analysis phase of the json schema  in which one object is created which have the all the reference of the object of Subscheam which have different base URI ( cause by $id , anchor and others ) 
Explained [here](https://docs.google.com/document/d/12M4C2p0TpUW4GkP8zwnn1iYLxgYFYRzehYpT49BHjq4/edit#heading=h.yqpvacifw5cm) .

This object is used by the `isValidPath` to resolve the subscheam which have different base URI and then fragment part of the path is resolved using the normal iteration from that reference if referecer resolved succesfully from the path given , then this method return True else False .



## getReference 

- This method is used to get the value/reference(if Object) of the path given in the `path` attribute
- If path is startWith #.../ then path is resolve wth respect to the current element for which conditions is checking or operation is performing
- It have `from` property which is the object from where we need to get the path resolve , if `from` property is given then path must start with the '#'
- If `from` attibute is not given and even path is not start with '#.../' in that case getReference resolve the path using base URI ( nearest $id , $anchore or etc ) and that resolved path which is the full URI is searched on the OBJECT which is made in the analysis state of the DSL which have all the reference to the Object map with the uri where baseUri get change. 



