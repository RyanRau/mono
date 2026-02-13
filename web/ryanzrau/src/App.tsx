import { ThemeProvider, Button, Card, Header, Text, Flexbox } from "bluestar";

function App() {
  return (
    <ThemeProvider>
      <div style={{ padding: "32px" }}>
        <Flexbox direction="column" gap={24}>
          <Header level={1}>Ryan Rau</Header>
          <Card>
            <Flexbox direction="column" gap={16}>
              <Header level={2}>Welcome</Header>
              <Text>
                This portfolio site is built with React and uses the Bluestar component library.
              </Text>
              <Flexbox gap={12}>
                <Button
                  label="Primary Button"
                  variant="primary"
                  onClick={() => console.log("Primary clicked")}
                />
                <Button
                  label="Secondary Button"
                  variant="secondary"
                  onClick={() => console.log("Secondary clicked")}
                />
              </Flexbox>
            </Flexbox>
          </Card>
        </Flexbox>
      </div>
    </ThemeProvider>
  );
}

export default App;
