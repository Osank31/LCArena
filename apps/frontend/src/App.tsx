import CodeEditor from "./components/CodeEditor";
import Resizable from "./components/Resizable";

const App = () => {
    return (
        <div className="App">
            <Resizable>
                <CodeEditor />
            </Resizable>
        </div>
    );
}

export default App