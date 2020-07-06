import {
  initializeBlock,
  useBase,
  useRecords,
  useGlobalConfig,
  Loader,
  Button,
  Box,
  TablePicker,
} from "@airtable/blocks/ui";
import React, { Fragment, useState } from "react";

const TABLE_NAME = "Products";
const IMAGE_FIELD_NAME = "Image";
const EDITED_IMAGE_FIELD_NAME = "Edited Image";
const MAX_RECORDS_PER_UPDATE = 50;
const API_ENDPOINT = "https://api.remove.bg/v1.0/removebg";

function ImageEditorBlock() {
  const base = useBase();

  const globalConfig = useGlobalConfig();
  const tableId = globalConfig.get("selectedTableId");

  const table = base.getTableByNameIfExists(tableId);
  const imageField = table.getFieldByName(IMAGE_FIELD_NAME);
  const records = useRecords(table, { fields: [imageField] });

  const [isUpdateInProgress, setIsUpdateInProgress] = useState(false);

  // check permissions
  const permissionCheck = table.checkPermissionsForUpdateRecord(undefined, {
    [EDITED_IMAGE_FIELD_NAME]: undefined,
  });

  async function onButtonClick() {
    setIsUpdateInProgress(true);
    const recordUpdates = await getImageUpdatesAsync(
      table,
      imageField,
      records
    );
    await updateRecordsInBatchesAsync(table, recordUpdates);
    setIsUpdateInProgress(false);
  }

  return (
    <div>
      <TablePicker
        table={table}
        onChange={(newTable) => {
          globalConfig.setAsync("selectedTableId", newTable.id);
        }}
      />
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
    </div>
  );
}

async function getImageUpdatesAsync(table, imageField, records) {
  const recordUpdates = [];
  for (const record of records) {
    const attachmentCellValue = record.getCellValue(imageField);
    console.log({ attachmentCellValue });
    const clientUrl = attachmentCellValue
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
    // if (attachmentCellValue) {
    //   const requestUrl = "https://api.remove.bg/v1.0/removebg";

    //   var headers = {
    //     "X-Api-Key": process.env.REMOVE_BG_API_KEY,
    //     "Content-Type": "application/json",
    //     Accept: "application/json",
    //   };

    //   var data = {
    //     image_url: "https://www.remove.bg/example.jpg",
    //     size: "auto",
    //   };

    //   const response = await fetch(requestUrl, {
    //     method: "POST",
    //     headers: headers,
    //     cors: true,
    //     body: JSON.stringify(data),
    //   });

    //   const updatedImage = await response.json();
    //   console.log({ updatedImage });
    //   editedImage = updatedImage.body;
    //   // editedImage = updatedImage.data.result_b64;
    //   // editedImage = new Image();
    //   editedImage = "data:image/png;base64, " + updatedImage.data.result_b64;

    //   console.log({ editedImage });
    // }

    recordUpdates.push({
      id: record.id,
      fields: {
        [EDITED_IMAGE_FIELD_NAME]: [{ url: editedImage }],
      },
    });

    // const image = record.getAttachmentClientUrlFromCellValueUrl()
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
