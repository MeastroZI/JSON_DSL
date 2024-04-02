const transformRule = {

    path: "*",
    condOperMapper: [
        {
            conditions : [
                {isKey : {key : "$id"} ,
                not : {condiArr : [
                    {hasParent : "properties"} , 
                    {hasParent : "definations"}
                ]}, 
                isType : {type : "string"},
                valuePattern : "^#"} 
            ] , 
            operations : {
                editChildKey : {key : "anchor"  }
            }
        }
    ]

}