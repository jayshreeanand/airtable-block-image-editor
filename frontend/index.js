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
  ColorPaletteSynced,
  colors,
  colorUtils,
  FormField,
  InputSynced,
  TablePickerSynced,
  FieldPickerSynced,
} from "@airtable/blocks/ui";
import { FieldType } from "@airtable/blocks/models";
import React, { Fragment, useState } from "react";
import SettingsForm from "./SettingsForm";
import { allowedColors } from "./allowedColors";
const url = require("url");
var cloudinary = require("cloudinary/lib/cloudinary").v2;
var removeBgApiKey, cloudinaryUrl, selectedColor;
const fs = require("fs");

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
  selectedColor = globalConfig.get("selectedColor");

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
  // const [color, setColor] = useState(allowedColors[0]);

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
      <ColorPaletteSynced
        globalConfigKey="selectedColor"
        allowedColors={allowedColors}
        squareMargin={2}
        width="150px"
      />
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
      const editedImage =
        "data:image/png;base64," + updatedImage.data.result_b64;
      console.log({ editedImage });

      const bgColor = colorUtils.getHexForColor(selectedColor) || "#333333";
      const cloudinaryImage = await cloudinary.uploader.upload(
        editedImage,
        { width: 300, height: 300, background: bgColor, crop: "pad" },
        function (error, result) {
          console.log(result, error);
          console.log({ result });
          return result;
        }
      );

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
