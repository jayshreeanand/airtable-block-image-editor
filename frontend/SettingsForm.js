import PropTypes from "prop-types";
import React from "react";
import { Box, Button, Heading, Text } from "@airtable/blocks/ui";

export default function SettingsForm({ setIsSettingsVisible }) {
  return (
    <Box
      flex="none"
      display="flex"
      flexDirection="column"
      width="100%"
      backgroundColor="white"
      maxHeight="100vh"
      borderLeft="thick"
    >
      <Box
        flex="auto"
        display="flex"
        flexDirection="column"
        minHeight="0"
        padding={3}
        overflowY="auto"
      >
        <Heading variant="caps" textColor="light" marginBottom={3}>
          Settings
        </Heading>
        <Text marginBottom={3}>
          The settings here will apply for all users.
        </Text>
        <Heading size="xsmall">Select tables to watch:</Heading>
      </Box>
      <Box
        flex="none"
        display="flex"
        justifyContent="flex-end"
        paddingY={1}
        marginX={1}
      >
        <Button
          variant="primary"
          size="large"
          onClick={() => setIsSettingsVisible(false)}
        >
          Done
        </Button>
      </Box>
    </Box>
  );
}

SettingsForm.propTypes = {
  setIsSettingsVisible: PropTypes.func.isRequired,
};
