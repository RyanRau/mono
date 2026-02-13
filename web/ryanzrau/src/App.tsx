import { ThemeProvider, Button, Card, Header, Text, Flexbox } from "bluestar";

function App() {
  return (
    <ThemeProvider>
      <Flexbox direction="column" gap="lg" padding="xl">
        <Header level={1}>Ryan Rau</Header>
        <Card>
          <Flexbox direction="column" gap="md">
            <Header level={2}>Welcome</Header>
            <Text>
              This portfolio site is built with React and uses the Bluestar component library.
            </Text>
            <Flexbox gap="sm">
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
    </ThemeProvider>
  );
}

export default App;
