import { Button } from "@myorg/ui-components";
import { formatDate } from "@myorg/utils";

function App() {
  return (
    <div>
      <h1>Hello World</h1>
      <p>Today is {formatDate(new Date())}</p>
      <Button onClick={() => alert("Clicked!")}>Click me</Button>
      <Button variant="secondary" onClick={() => alert("Secondary clicked!")}>
        Secondary
      </Button>
    </div>
  );
}

export default App;
