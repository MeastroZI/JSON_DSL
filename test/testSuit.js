const testSuits = [
    //************************Items******************************* */
    {
        "description": "a schema given for items",
        "schema": {
            
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": { "type": "integer" }
        }
    },
    {
        "description": "an array of schemas for items",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": [
                { "type": "integer" },
                { "type": "string" }
            ]
        }
    },
    {
        "description": "items with boolean schema (true)",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": true
        }
    },
    {
        "description": "items with boolean schema (false)",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": false
        }
    },
    {
        "description": "items with boolean schemas",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": [true, false]
        }
    },
    {
        "description": "items and subitems",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "$defs": {
                "item": {
                    "type": "array",
                    "additionalItems": false,
                    "items": [
                        { "$ref": "#/$defs/sub-item" },
                        { "$ref": "#/$defs/sub-item" }
                    ]
                },
                "sub-item": {
                    "type": "object",
                    "required": ["foo"]
                }
            },
            "type": "array",
            "additionalItems": false,
            "items": [
                { "$ref": "#/$defs/item" },
                { "$ref": "#/$defs/item" },
                { "$ref": "#/$defs/item" }
            ]
        }
    },
    {
        "description": "nested items",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "type": "array",
            "items": {
                "type": "array",
                "items": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "number"
                        }
                    }
                }
            }
        }
    },
    {
        "description": "single-form items with null instance elements",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": {
                "type": "null"
            }
        }
    },
    {
        "description": "array-form items with null instance elements",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": [
                {
                    "type": "null"
                }
            ]
        }
    },

    /**********************************additionalItems**********************************/

    {
        "description": "additionalItems as schema",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": [{}],
            "additionalItems": { "type": "integer" }
        }
    },
    {
        "description": "when items is schema, additionalItems does nothing",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": {
                "type": "integer"
            },
            "additionalItems": {
                "type": "string"
            }
        }
    },
    {
        "description": "when items is schema, boolean additionalItems does nothing",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": {},
            "additionalItems": false
        }
    },
    {
        "description": "array of items with no additionalItems permitted",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": [{}, {}, {}],
            "additionalItems": false
        }
    },
    {
        "description": "additionalItems as false without items",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "additionalItems": false
        }
    },
    {
        "description": "additionalItems are allowed by default",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": [{ "type": "integer" }]
        }
    },
    {
        "description": "additionalItems does not look in applicators, valid case",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "allOf": [
                { "items": [{ "type": "integer" }] }
            ],
            "additionalItems": { "type": "boolean" }
        }
    },
    {
        "description": "additionalItems does not look in applicators, invalid case",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "allOf": [
                { "items": [{ "type": "integer" }, { "type": "string" }] }
            ],
            "items": [{ "type": "integer" }],
            "additionalItems": { "type": "boolean" }
        }
    },
    {
        "description": "items validation adjusts the starting index for additionalItems",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": [{ "type": "string" }],
            "additionalItems": { "type": "integer" }
        }
    },
    {
        "description": "additionalItems with heterogeneous array",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": [{}],
            "additionalItems": false
        }
    },
    {
        "description": "additionalItems with null instance elements",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "additionalItems": {
                "type": "null"
            }
        }
    },
    /*****************************Ref*************************************** */


    {
        "description": "root pointer ref",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "properties": {
                "foo": { "$ref": "#" }
            },
            "additionalProperties": false
        }
    },
    {
        "description": "relative pointer ref to object",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "properties": {
                "foo": { "type": "integer" },
                "bar": { "$ref": "#/properties/foo" }
            }
        }
    },
    {
        "description": "relative pointer ref to array",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "items": [
                { "type": "integer" },
                { "$ref": "#/items/0" }
            ]
        }
    },
    {
        "description": "escaped pointer ref",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "$defs": {
                "tilde~field": { "type": "integer" },
                "slash/field": { "type": "integer" },
                "percent%field": { "type": "integer" }
            },
            "properties": {
                "tilde": { "$ref": "#/$defs/tilde~0field" },
                "slash": { "$ref": "#/$defs/slash~1field" },
                "percent": { "$ref": "#/$defs/percent%25field" }
            }
        }
    },
    {
        "description": "nested refs",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "$defs": {
                "a": { "type": "integer" },
                "b": { "$ref": "#/$defs/a" },
                "c": { "$ref": "#/$defs/b" }
            },
            "$ref": "#/$defs/c"
        }
    },
    {
        "description": "ref applies alongside sibling keywords",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "$defs": {
                "reffed": {
                    "type": "array"
                }
            },
            "properties": {
                "foo": {
                    "$ref": "#/$defs/reffed",
                    "maxItems": 2
                }
            }
        }
    },
    {
        "description": "remote ref, containing refs itself",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "$ref": "https://json-schema.org/draft/2019-09/schema"
        }
    },
    {
        "description": "property named $ref that is not a reference",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "properties": {
                "$ref": { "type": "string" }
            }
        }
    },
    {
        "description": "property named $ref, containing an actual $ref",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "properties": {
                "$ref": { "$ref": "#/$defs/is-string" }
            },
            "$defs": {
                "is-string": {
                    "type": "string"
                }
            }
        }
    },
    {
        "description": "$ref to boolean schema true",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "$ref": "#/$defs/bool",
            "$defs": {
                "bool": true
            }
        }
    },
    {
        "description": "$ref to boolean schema false",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "$ref": "#/$defs/bool",
            "$defs": {
                "bool": false
            }
        }
    },
    {
        "description": "Recursive references between schemas",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "$id": "http://localhost:1234/draft2019-09/tree",
            "description": "tree of nodes",
            "type": "object",
            "properties": {
                "meta": { "type": "string" },
                "nodes": {
                    "type": "array",
                    "items": { "$ref": "node" }
                }
            },
            "required": ["meta", "nodes"],
            "$defs": {
                "node": {
                    "$id": "http://localhost:1234/draft2019-09/node",
                    "description": "node",
                    "type": "object",
                    "properties": {
                        "value": { "type": "number" },
                        "subtree": { "$ref": "tree" }
                    },
                    "required": ["value"]
                }
            }
        }
    },
    {
        "description": "refs with quote",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "properties": {
                "foo\"bar": { "$ref": "#/$defs/foo%22bar" }
            },
            "$defs": {
                "foo\"bar": { "type": "number" }
            }
        }
    },
    {
        "description": "ref creates new scope when adjacent to keywords",
        "schema": {
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "$defs": {
                "A": {
                    "unevaluatedProperties": false
                }
            },
            "properties": {
                "prop1": {
                    "type": "string"
                }
            },
            "$ref": "#/$defs/A"
        }
    }


]

