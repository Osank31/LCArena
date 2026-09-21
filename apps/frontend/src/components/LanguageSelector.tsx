import {
    Box,
    Button,
    Menu,
    Text,
} from "@chakra-ui/react"

type LanguageSelectorProps = {
    language: string
    onSelect: (language: string) => void
}

const languages = [
    { value: "cpp", label: "C++" },
    { value: "python", label: "Python" },
    { value: "javascript", label: "JavaScript" },
    { value: "java", label: "Java" },
]

const LanguageSelector = ({
    language,
    onSelect,
}: LanguageSelectorProps) => {
    // Find label or fallback safely
    const selectedLanguage =
        languages.find((item) => item.value === language)?.label ?? "Select Language"

    return (
        <Box>
            <Text mb={2} fontSize="sm">
                Select a language:
            </Text>

            {/* Handle selection cleanly at the root level */}
            <Menu.Root onSelect={(details) => onSelect(details.value)}>
                <Menu.Trigger asChild>
                    <Button variant="outline">
                        {selectedLanguage}
                    </Button>
                </Menu.Trigger>

                <Menu.Positioner>
                    <Menu.Content>
                        {languages.map((item) => (
                            <Menu.Item
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </Menu.Item>
                        ))}
                    </Menu.Content>
                </Menu.Positioner>
            </Menu.Root>
        </Box>
    )
}

export default LanguageSelector
