import {
  initializeBlock,
  useBase,
  useRecords,
  Loader,
  Button,
  Box
} from '@airtable/blocks/ui';
import React, {Fragment, useState} from 'react';

const TABLE_NAME = 'Products';
const IMAGE_FIELD_NAME = 'Image';
const EDITED_IMAGE_FIELD_NAME = 'Edited Image';
const MAX_RECORDS_PER_UPDATE = 50;
const API_ENDPOINT = ''

function ImageEditorBlock() {
  const base = useBase();

  const table = base.getTableByName(TABLE_NAME);
  const imageField = table.getFieldByName(IMAGE_FIELD_NAME)
  const records = useRecords(table, { fields: [imageField]});


  const [isUpdateInProgress, setIsUpdateInProgress] = useState(false);

  // check permissions
  const permissionCheck = table.checkPermissionsForUpdateRecord(undefined, {
    [EDITED_IMAGE_FIELD_NAME]: undefined,
  });

  async function onButtonClick() {
    setIsUpdateInProgress(true);
    const recordUpdates = await getImageUpdatesAsync(table, imageField, records);
    await updateRecordsInBatchesAsync(table, recordUpdates);
    setIsUpdateInProgress(false);
  }

  return (
    <Box
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
            {!permissionCheck.hasPermission && permissionCheck.reasonDisplayString}
          </Fragment>
        )}
    </Box>
  );
}

function getAttachmentUrl(record, attachmentCellValue) {
  attachmentCellValue.map(attachmentObj => {
    const clientUrl =
      record.getAttachmentClientUrlFromCellValueUrl(
          attachmentObj.id,
          attachmentObj.url
      );
    return clientUrl;
  });
}

async function getImageUpdatesAsync(table, imageField, records) {
    const recordUpdates = [];
    for (const record of records) {
      const attachmentCellValue = record.getCellValue(imageField);

      const clientUrl = attachmentCellValue ? getAttachmentUrl(record, attachmentCellValue) : 'nothing here'

      recordUpdates.push({
        id: record.id,
        fields: {
          [EDITED_IMAGE_FIELD_NAME]: clientUrl
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
  return new Promise(resolve => setTimeout(resolve, ms));
}

initializeBlock(() => <ImageEditorBlock />);
