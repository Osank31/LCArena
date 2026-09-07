import {CodeArea} from "@LCArena/ui"
// function App() {

//     const handleOnChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
//         // console.log("Code changed:", event.target.value)
//         const code = event.target.value
//         const start = event.target.selectionStart
//         const end = event.target.selectionEnd
//         const beforeCursor = code.slice(0, start)
//         const afterCursor = code.slice(end)

//         const currentLine = beforeCursor.split("\n").pop() ?? ""
//         console.log("Current line:", currentLine)

//         const indentation = getIndentation(
//             currentLine,
//             language
//         )

//         const newText = "\n" + indentation


//         const updatedCode =
//             beforeCursor +
//             newText +
//             afterCursor
//     }
//     return (
//         <>
//             <textarea onChange={handleOnChange} placeholder="Enter your code here..." />
//         </>
//     )
// }

// export default App


const App = () => {
    return (
    <div className="max-w-3xl mx-auto p-8">
        <CodeArea 
            defaultValue={`class Solution {\n\tpublic:\n\t\tvector<int> twoSum(vector<int>& nums, int target) {\n\t\t\t\n\t\t}\n};`}
            onChange={(e) => console.log("Code changed:", e.target.value)}
        />
    </div>)
}

export default App