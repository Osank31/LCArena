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
    const selectedLanguage =
        languages.find((item) => item.value === language)?.label ?? "C++"

    return (
        <Box>
            <Text mb={2} fontSize="sm">
                Select a language:
            </Text>

            <Menu.Root>
                <Menu.Trigger asChild>
                    <Button>
                        {selectedLanguage}
                    </Button>
                </Menu.Trigger>

                <Menu.Positioner>
                    <Menu.Content>
                        {languages.map((item) => (
                            <Menu.Item
                                key={item.value}
                                value={item.value}
                                onClick={() => onSelect(item.value)}
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
