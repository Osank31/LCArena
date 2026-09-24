import CodeEditor from "./CodeEditor"
import DescriptionBox from "./DescriptionBox"
import Resizable from "./Resizable"
import TestCases from "./TestCases"

const ProblemWindow = () => {

    return (
        <div className="App" style={{ height: "100vh", backgroundColor: "#1e1e1e", color: "#d4d4d4" }}>
            <Resizable direction="horizontal" initialSize={40}>
                {/* Left Panel: Description */}
                <DescriptionBox/>

                {/* Right Panel: Code Editor and Testcases */}
                <Resizable direction="vertical" initialSize={70}>
                    {/* Top Right: Code Editor */}
                    <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <CodeEditor />
                    </div>

                    {/* Bottom Right: Testcases */}
                    <TestCases />
                </Resizable>
            </Resizable>
        </div>
    )
}

export default ProblemWindow;