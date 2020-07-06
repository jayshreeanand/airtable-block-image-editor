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
const url = require("url");
var cloudinary = require("cloudinary/lib/cloudinary").v2;
var removeBgApiKey, cloudinaryUrl;
const fs = require("fs");

// const TABLE_NAME = "Products";
// const IMAGE_FIELD_NAME = "Image";
const EDITED_IMAGE_FIELD_NAME = "Edited Image";
const MAX_RECORDS_PER_UPDATE = 50;
const API_ENDPOINT = "https://api.remove.bg/v1.0/removebg";

function ImageEditorBlock() {
  const base = useBase();

  // Settings
  useSettingsButton(() => {
    setIsSettingsVisible(!isSettingsVisible);
  });

  const globalConfig = useGlobalConfig();

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const tableId = globalConfig.get("selectedTableId");
  const table = base.getTableByIdIfExists(tableId);

  removeBgApiKey = globalConfig.get("removeBgApiKey");
  cloudinaryUrl = globalConfig.get("cloudinaryUrl");

  if (cloudinaryUrl != null) {
    let uri = url.parse(cloudinaryUrl, true);

    const cloudinaryApiKey = uri.auth && uri.auth.split(":")[0];
    const cloudinaryApiSecret = uri.auth && uri.auth.split(":")[1];

    // let parsedConfig = {
    //   cloud_name: uri.host,
    //   api_key: uri.auth && uri.auth.split(":")[0],
    //   api_secret: uri.auth && uri.auth.split(":")[1],
    //   private_cdn: uri.pathname != null,
    //   secure_distribution: uri.pathname && uri.pathname.substring(1),
    // };

    console.log(uri.host);
    console.log(cloudinaryApiKey);
    console.log(cloudinaryApiSecret);
    cloudinary.config({
      cloud_name: uri.host,
      api_key: cloudinaryApiKey,
      api_secret: cloudinaryApiSecret,
    });
  }

  const imageFieldId = globalConfig.get("imageFieldId");
  const imageField = table ? table.getFieldByIdIfExists(imageFieldId) : null;

  const editedImageFieldId = globalConfig.get("editedImageFieldId");
  const editedImageField = table
    ? table.getFieldByIdIfExists(editedImageField)
    : null;

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
      <FormField label="Cloudinary URL">
        <InputSynced
          globalConfigKey="cloudinaryUrl"
          placeholder="Cloudinary Url"
          width="630px"
        />
      </FormField>

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
        format: "png",
      };

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: headers,
        cors: true,
        body: JSON.stringify(data),
      });

      const updatedImage = await response.json();
      console.log({ updatedImage });
      // const editedImage = updatedImage.body;
      // editedImage = updatedImage.data.result_b64;
      // editedImage = new Image();
      const editedImage =
        "data:image/png;base64, " + updatedImage.data.result_b64;
      console.log({ editedImage });

      const cloudinaryImage = await cloudinary.uploader.upload(
        editedImage,
        // "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
        // "data:image/png;base64, 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",
        // "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==",
        function (error, result) {
          console.log(result, error);
          console.log({ result });
          return result;
        }
      );

      // cloudinary.uploader.upload(
      //   "pizza.jpg",
      //   { tags: "basic_sample" },
      //   function (err, image) {
      //     console.log();
      //     console.log("** File Upload");
      //     if (err) {
      //       console.warn(err);
      //     }
      //     console.log(
      //       "* public_id for the uploaded image is generated by Cloudinary's service."
      //     );
      //     console.log("* " + image.public_id);
      //     console.log("* " + image.url);
      //     waitForAllUploads("pizza", err, image);
      //   }
      // );

      recordUpdates.push({
        id: record.id,
        fields: {
          [EDITED_IMAGE_FIELD_NAME]: [{ url: cloudinaryImage.secure_url }],
        },
      });
    }

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
