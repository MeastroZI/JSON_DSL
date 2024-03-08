let count = 0
function some (){
    count = count + 1 
    console.log(count)
    some ()
    return
}
some ()