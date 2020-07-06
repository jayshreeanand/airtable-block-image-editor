import {
  initializeBlock,
  useBase,
  useRecords,
  useGlobalConfig,
  useSettingsButton,
  Label,
  Loader,
  Button,
  Box,
  FormField,
  InputSynced,
  TablePickerSynced,
  FieldPickerSynced,
} from "@airtable/blocks/ui";
import { FieldType } from "@airtable/blocks/models";
import React, { Fragment, useState } from "react";
import SettingsForm from "./SettingsForm";

// const TABLE_NAME = "Products";
// const IMAGE_FIELD_NAME = "Image";
const EDITED_IMAGE_FIELD_NAME = "Edited Image";
const MAX_RECORDS_PER_UPDATE = 50;
const API_ENDPOINT = "https://api.remove.bg/v1.0/removebg";

function ImageEditorBlock() {
  const base = useBase();

  const globalConfig = useGlobalConfig();

  // Settings
  useSettingsButton(() => {
    setIsSettingsVisible(!isSettingsVisible);
  });

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const tableId = globalConfig.get("selectedTableId");
  const table = base.getTableByIdIfExists(tableId);

  const imageFieldId = globalConfig.get("imageFieldId");
  const imageField = table ? table.getFieldByIdIfExists(imageFieldId) : null;

  const editedImageFieldId = globalConfig.get("editedImageFieldId");
  const editedImageField = table
    ? table.getFieldByIdIfExists(editedImageField)
    : null;

  const removeBgApiKey = globalConfig.get("removeBgApiKey");

  // const imageField = table.getFieldByName(IMAGE_FIELD_NAME);
  const records = useRecords(table, { fields: [imageField] });

  const [isUpdateInProgress, setIsUpdateInProgress] = useState(false);

  // check permissions
  const permissionCheck = imageField
    ? table.checkPermissionsForUpdateRecord(undefined, {
        [imageField.name]: undefined,
      })
    : { hasPermission: false, reasonDisplayString: "Table does not exist" };

  async function onButtonClick() {
    setIsUpdateInProgress(true);
    const recordUpdates = await getImageUpdatesAsync(
      table,
      imageField,
      records,
      removeBgApiKey
    );
    await updateRecordsInBatchesAsync(table, recordUpdates);
    setIsUpdateInProgress(false);
  }

  // const handleApiKeyChange = () => {
  //   const removeBgApiKey = globalConfig.get("removeBgApiKey");

  //   globalConfig.setPathsAsync("removeBgApiKey", removeBgApiKey);
  // };

  // function updateApiKeyIfPossible(apiKey) {
  //   if (globalConfig.hasPermissionToSetPaths("apiKey", apiKey)) {
  //     globalConfig.setPathsAsync("apiKey", apiKey);
  //   }
  //   // The update is now applied within your block (eg will be
  //   // reflected in globalConfig) but are still being saved to
  //   // Airtable servers (e.g. may not be updated for other users yet)
  // }
  // async function updateApiKeyIfPossibleAsync(apiKey) {
  //   if (globalConfig.hasPermissionToSet("apiKey", apiKey)) {
  //     await globalConfig.setAsync("apiKey", apiKey);
  //   }
  //   // globalConfig updates have been saved to Airtable servers.
  //   alert("apiKey has been updated");
  // }

  return (
    <Box padding={3} borderBottom="thick">
      {isSettingsVisible && (
        <SettingsForm setIsSettingsVisible={setIsSettingsVisible} />
      )}
      <FormField label="Table">
        <TablePickerSynced globalConfigKey="selectedTableId" />
      </FormField>
      <FormField label="Image Field">
        <FieldPickerSynced
          table={table}
          globalConfigKey="imageFieldId"
          placeholder="Pick source image field"
          allowedTypes={[FieldType.MULTIPLE_ATTACHMENTS]}
        />
      </FormField>
      <FormField label="Edited Image Field">
        <FieldPickerSynced
          table={table}
          globalConfigKey="editedImageFieldId"
          placeholder="Pick the field for edited image"
          allowedTypes={[FieldType.MULTIPLE_ATTACHMENTS]}
        />
      </FormField>
      <FormField label="Remove BG API Key">
        <InputSynced
          globalConfigKey="removeBgApiKey"
          placeholder="API KEY"
          width="630px"
        />
      </FormField>

      <div
        position="absolute"
        top="0"
        bottom="0"
        left="0"
        right="0"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
      >
        {isUpdateInProgress ? (
          <Loader />
        ) : (
          <Fragment>
            <Button
              variant="primary"
              onClick={onButtonClick}
              disabled={!permissionCheck.hasPermission}
              marginBottom={3}
            >
              Update Images
            </Button>
            {!permissionCheck.hasPermission &&
              permissionCheck.reasonDisplayString}
          </Fragment>
        )}
      </div>
    </Box>
  );
}

async function getImageUpdatesAsync(
  table,
  imageField,
  records,
  removeBgApiKey
) {
  const recordUpdates = [];
  for (const record of records) {
    const attachmentCellValue = record.getCellValue(imageField);
    console.log({ attachmentCellValue });
    const imageUrl = attachmentCellValue
      ? attachmentCellValue[0]["url"]
      : "nothing here";

    // request.post(
    //   {
    //     url: "https://api.remove.bg/v1.0/removebg",
    //     formData: {
    //       image_url: "https://www.remove.bg/example.jpg",
    //       size: "auto",
    //     },
    //     headers: {
    //       "X-Api-Key": "SuyJzZp3BRKy6XxmLLeCY2BJ",
    //       Accept: "application/json",
    //       "Content-Type": "application/json",
    //     },
    //     // encoding: null,
    //   },
    //   function (error, response, body) {
    //     // if (error) return console.error("Request failed:", error);
    //     // if (response.statusCode != 200)
    //     //   return console.error(
    //     //     "Error:",
    //     //     response.statusCode
    //     //     // body.toString("utf8")
    //     //   );
    //     // console.log({ body });
    //     // fs.writeFileSync("no-bg.png", body);
    //   }
    // );

    var editedImage = null;
    if (attachmentCellValue) {
      const requestUrl = "https://api.remove.bg/v1.0/removebg";

      var headers = {
        "X-Api-Key": removeBgApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      var data = {
        image_url: imageUrl,
        size: "auto",
      };

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: headers,
        cors: true,
        body: JSON.stringify(data),
      });

      const updatedImage = await response.json();
      console.log({ updatedImage });
      editedImage = updatedImage.body;
      // editedImage = updatedImage.data.result_b64;
      // editedImage = new Image();
      editedImage = "data:image/png;base64, " + updatedImage.data.result_b64;

      console.log({ editedImage });
    }

    recordUpdates.push({
      id: record.id,
      fields: {
        [EDITED_IMAGE_FIELD_NAME]: [{ url: editedImage }],
      },
    });

    // const image = record.getAttachmentimageUrlFromCellValueUrl()
    // const image = record.getCellValueAsString(titleField);
    // const requestUrl = `${API_ENDPOINT}/${encodeURIComponent(articleTitle)}?redirect=true`;
    // const response = await fetch(requestUrl, {cors: true});
    // const pageSummary = await response.json();

    // recordUpdates.push({
    //     id: record.id,
    //     fields: {
    //         [EXTRACT_FIELD_NAME]: pageSummary.extract,
    //         [IMAGE_FIELD_NAME]: pageSummary.originalimage
    //             ? [{url: pageSummary.originalimage.source}]
    //             : undefined,
    //     },
    // });

    await delayAsync(50);
  }
  return recordUpdates;
}

async function updateRecordsInBatchesAsync(table, recordUpdates) {
  let i = 0;
  while (i < recordUpdates.length) {
    const updateBatch = recordUpdates.slice(i, i + MAX_RECORDS_PER_UPDATE);
    await table.updateRecordsAsync(updateBatch);
    i += MAX_RECORDS_PER_UPDATE;
  }
}

function delayAsync(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

initializeBlock(() => <ImageEditorBlock />);
