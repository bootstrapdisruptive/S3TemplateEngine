'use strict';
/**
 * @lambda <ENV>_HOK_render_html_files
 * 
 * Can be triggered by a DynamoDB stream (with configuration "old and new image" or an S3 notification.
 * Processes updates html export files, caused by updates in their sources (html and part files from S3 or 
 * database/Webiny content reported by DynamoDB stream)
 * 
 * @param {object} event (DynamoDB Stream or S3 notification)
 * 
 * @returns {int | object} 0 or error object
 */
 
/**
 * 
 * Tested Usecases:
 * 
 * + Create website file (.html)
 * + Delete website file (.html)
 * + Create part
 * + Delete part
 * + Create Webiny Content 
 * + Delete Webiny Content 
 * + Create Webiny StaticCodeContent 
 * + Delete Webiny StaticCodeContent 
 * + Create Webiny StaticContent
 * + Delete Webiny StaticContent
 * + Create file (.html) with multiple files
 * + Delete file (.html) with multiple files 
 * + Create Webiny Content for multiple files
 * + Delete Webiny Content for multiple files
 * 
 */

/** Map environment variables */
    const sRegion = process.env.AWS_REGION;
    const sHtmlPartElementTable = process.env.html_part_element_table;
    const sWebinyContentTable = process.env.content_table;
    const sEnv = process.env.env; /* DEV, STAGE or PROD */
    const oConfig = JSON.parse(process.env.config);
    var sOriginBucket = ""; 
    var sDestBucket = "";
    var sVariant = "";
    let oLangSetUp = null;
    let sCurrentLang = null;
    let sCurrentURL = null;    

/** Prepare AWS objects */
    import { S3Client, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
    const s3 = new S3Client({region: sRegion});
    import { DynamoDBClient, PutItemCommand, DeleteItemCommand, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
    const ddb = new DynamoDBClient({region: sRegion});

/** Prepare global constnats */
    var aReplaceCommands = ["part","dbpart","dbmulti","dbitem"];
    var aReplaceCommandsDB = [1,2,3,4]; //1=replacement from S3, 2=replacement from DDB, 3=multi replacement from DDB, 4=handle dbitem inside multifile


/** Main handler. 
  * Lamnbda builds a new environment and invokes new calls into htis environment
  * for a certain, not predictable, time. In that case everything outside of
  * this handler will persist. This is OK for cosntants, but ends up 
  * unpredictable for gobal variables and (under certain cirsumstances) for
  * variables in helper functions.
  * Therefore, helper functions are part of this main handler, so they are
  * initialized freshly and behave predictable on each call of the lambda.
  */
export const handler = async (event, context) => {
    console.log("event:" ,JSON.stringify(event)); //For error debugging: push event to CloudWatch

    /** Helper */
        
        /** Prepare global variables */
            var oReplacementStore = {};
            var aReplacementShortList = [];    

        /**
         * @function streamToString
         * 
         * Transform readable stream into string
         * 
         * @param {object} stream   Readable stream from S3 GetObject
         * 
         * @return {string}  Content of Stream as string
         */
        const streamToString = (stream) =>
            new Promise((resolve, reject) => {
            const chunks = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("error", reject);
            stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        });


        /**
         * @function HOK_scanTable
         * 
         * Uses the "scan" command untill all data is loaded
         * 
         * @param {object} documentClient   DynamoDB Document CLient to use for scan
         * @param {object} params           Scan parameters
         * 
         * @return {array}  Array with of scan results 
         */
        async function HOK_scanTable(documentClient, params) {
            const scanResults = [];
            let items = null;
            do{
                items = await documentClient.send(new ScanCommand(params));
                items.Items.forEach((item) => scanResults.push(item));
                params.ExclusiveStartKey  = items.LastEvaluatedKey;
            }while(typeof items.LastEvaluatedKey !== "undefined");
            return scanResults;
        }

        /**
         * @function HOK_writePartUseage
         * 
         * Writes part useage of current file into ddb for later updates if
         * part is changed.
         * 
         * @param aParts    <array>     An Array of strings, naming the parts
         * @param sSource   <string>    Website file name, prefixed by <variant name>:
         * @param sSrcKey   <string>    Website file path and name
         * 
         * @return always 0
         */
        async function HOK_writePartUseage(aParts, sSource, sSrcKey){
    		const params = {
    			TableName:sHtmlPartElementTable,
    			FilterExpression: '#attr = :val',
    			ExpressionAttributeNames:{
    		    	"#attr": "source"
    			},
    			ExpressionAttributeValues: { 
    				':val': {"S":sSource}
    			}		
    		};
    		const oData = await HOK_scanTable(ddb,params);
    		
            //Add parts that are missing in ddb
            	for (let i=0; i<aParts.length; i++){
            	    let bExists = false;
            	    for(let j=0; j<oData.length ;j++){
            	        if(oData[j].part.S==aParts[i]){
            	            bExists = true;
            	            j=oData.length;
            	        }
            	    }
            	    //if existing: skip 
            	    //else write to target DynamoDB       
                    if(!bExists){
                        let oParams = {
                          TableName: sHtmlPartElementTable,
                          Item: {
                              "source":{"S":sSource},
                              "part":{"S":aParts[i]},
                              "template": {"S":sSrcKey}
                          }
                        };   
                        await ddb.send(new PutItemCommand(oParams)).then((res) =>{console.log(res);});
                        oData.push(oParams.Item);
                    }    	    
                }

            //Remove parts not used anmyore in ddb
        	    for(let j=0; j<oData.length ;j++){
        	       	let bExists = false;
        	       	for (let i=0; i<aParts.length; i++){
            	        if(oData[j].part.S==aParts[i]){
            	            bExists = true;
            	            i=aParts.length;
            	        }
        	       	}
                    if(!bExists){
                        const oParams = {
                			TableName:sHtmlPartElementTable,
                			"Key": {
                			    source: oData[j].source,
                			    part: oData[j].part                			    
                			}	
                		};
                        await ddb.send(new DeleteItemCommand(oParams));
                    }
        	    }        

            return 0;
        }

       /**
         * @function HOK_handleFileAttribute
         * 
         * handles <fileattribute></fileattribute> replacements
         * 
         * @param sAttribute <string> Attribute to Process
         * 
         * @return sValue <string> Value to Return
         */
        async function HOK_handleFileAttribute(sAttribute, sFilename){
            let sValue="";
            switch (sAttribute) {
                case "filename":
                    sValue=sFilename;
                    break;
            }
            return sValue;
        }

       /**
         * @function HOK_processFileAttributes
         * 
         * handles <fileattribute></fileattribute> replacements
         * 
         * @param sInputHTML    <string>    HTML
         * @param sFilename     <string>    Name of target HTML file
         * 
         * @return sOutputHTML  <string>    resolved HTML
         */
        async function HOK_processFileAttributes(sInputHTML, sFilename){
            const sOpenTag = "<fileattribute>";
            const sCloseTag = "</fileattribute>";
            let sOutputHTML = "";
            const start = sInputHTML.indexOf(sOpenTag);
            if (start > -1){
                const end = sInputHTML.indexOf(sCloseTag); 
                sOutputHTML += await sInputHTML.slice(0, start);  
                sOutputHTML += await HOK_handleFileAttribute(sInputHTML.slice(start+sOpenTag.length, end),sFilename);
                const newInputHTML = sInputHTML.slice(end+sCloseTag.length);
                if (newInputHTML.indexOf(sOpenTag) > -1){
                    sOutputHTML += await HOK_processFileAttributes(newInputHTML);
                } else {
                    sOutputHTML += newInputHTML;
                }
            }else{
                sOutputHTML += sInputHTML;        
            }
            const start2 = sOutputHTML.indexOf(sOpenTag);
            if (start2 > -1){
                sOutputHTML = await HOK_processFileAttributes(sOutputHTML);
            }
            return(sOutputHTML);
        }

       /**
         * @function HOK_processmulti
         * 
         * Handles requests for replacement from db multi, by chaining multiple
         * responses.
         * 
         * @param oReplacementHTML  <object>    dbmulti object
         * 
         * @return          <string>    HTML content to insert
         *                              or error object
         */        
        async function HOK_processmulti(oReplacementHTML){
            //scan for all items that match "filter"
        	    let oScanParams = {
        			TableName:sWebinyContentTable,
        			FilterExpression:"",
        			ExpressionAttributeNames:{},
        			ExpressionAttributeValues:{}
        		};
        		for(let i=0;i<oReplacementHTML.filter.length;i++){
        		    if( oReplacementHTML.filtertype == "contains"){
        		      oScanParams.FilterExpression = oScanParams.FilterExpression + "contains(#attr"+i+", :val"+i+")";
        		    }else{
        		      oScanParams.FilterExpression = oScanParams.FilterExpression + "#attr"+i+" = :val"+i;  
        		    }
        		    const sKey = Object.keys(oReplacementHTML.filter[i])[0];
        		    const oContent = oReplacementHTML.filter[i][sKey];
        		    oScanParams.ExpressionAttributeNames["#attr"+i] = sKey; 
        		    oScanParams.ExpressionAttributeValues[":val"+i] = oContent;
        		}
                const aScanResult = await HOK_scanTable(ddb,oScanParams);
            //Sort scan result by "order" attribute
                aScanResult.sort((a, b) => {
                    if(a.order==undefined) {
                        return 1;
                    }
                    if(b.order==undefined) {
                        return -1;
                    }                    
                    return a.order.N - b.order.N;
                });

            //generate HTML from all items and chain them together
                let sResult = "";
                for(let i=0; i<aScanResult.length;i++){
                    sResult += await HOK_processPartAttributes(oReplacementHTML.template,aScanResult[i]);
                }
            return (sResult);
        }

       /**
         * @function HOK_getPartHTML
         * 
         * Handles requests for replacement from files. It either answers it
         * from global object (in case the same snippet is used multiple times
         * within one update) or by reading the according source:
         *   - a file form the "part" folder
         *   - the according entry form the DB 
         * 
         * @param {string} sPartID      id (name of the part file) to process
         * @param {int} iDB             1 = replacement from S3, 
         *                              2 = replacement from DDB
         *                              3 = multi replacement from DDB
         *                              4 = handle dbitem inside multifile
         * @param {object} oDBItem      Item to process (rather than read it
         *                              from file), default null 
         * 
         * @return          <string>    HTML content to insert
         *                              or error object
         */        
        async function HOK_getPartHTML(sPartID,iDB,oDBItem=null){
                const sPartIDRaw = sPartID; 
            //Add file content to global variable, if it's not already part of it
                switch (iDB) {
                    case 4:
                        sPartID = "ddb_"+sPartID+"_"+sCurrentLang;
                        delete oReplacementStore[sPartID];
                        aReplacementShortList.push(sWebinyContentTable);
                        if(oDBItem[sPartIDRaw]?.S!=undefined){oReplacementStore[sPartID]= oDBItem[sPartIDRaw].S;}
                        if(oDBItem[sPartIDRaw]?.N!=undefined){oReplacementStore[sPartID]= oDBItem[sPartIDRaw].N;}
                        if(oDBItem[sPartIDRaw]?.L!=undefined){
                            oReplacementStore[sPartID]="";
                            for (let k=0;k<oDBItem[sPartIDRaw].L.length;k++){
                                oReplacementStore[sPartID] += "<a href='"+oDBItem[sPartIDRaw].L[k].S+"'>"+oDBItem[sPartIDRaw].L[k].S.substring(oDBItem[sPartIDRaw].L[k].S.lastIndexOf("-")+1)+"</a>";
                            }
                        }
                        break;
                    case 3:
                        let oPart = JSON.parse(sPartID);
                        sPartID = sWebinyContentTable;//Ensure id is unique, by prefixing ids of DB entries
                        aReplacementShortList.push(sPartID);                                   
                        oReplacementStore[sPartID] = await HOK_processmulti(oPart);
                        break;                    
                    case 2:
                        let sPartIDforPartTable = "ddb_"+sPartID;
                        aReplacementShortList.push(sPartIDforPartTable);
                        sPartID = sPartIDforPartTable+"_"+sCurrentLang;                        
                        if( oReplacementStore[sPartID] == undefined){
                        //Part originates in Database/Webiny
                    		const oParams = {
                                TableName: sWebinyContentTable,
                                IndexName : 'contentid',
                                KeyConditionExpression : 'contentid = :contentidVal', 
                                ExpressionAttributeValues : {
                                    ':contentidVal' : {"S":sPartIDRaw}
                                }
                    		};
                            try{
                                let bAborted = true;
                                                        
                                const oData = await ddb.send(new QueryCommand(oParams));
                                if(oData.Items!=undefined){
                                    if(oData.Items.length>0){
                                        if(oData.Items[0]["content"+sCurrentLang]!=undefined){
                                            oReplacementStore[sPartID+"_"+sCurrentLang]=oData.Items[0]["content"+sCurrentLang].S;
                                            bAborted = false;
                                        }else if(oData.Items[0]["content"]!=undefined){
                                            oReplacementStore[sPartID+"_"+sCurrentLang]=oData.Items[0]["content"].S;
                                            bAborted = false;
                                        }
                                    }
                                }
                                if(bAborted){
                                    console.warn("Database Item "+sPartIDRaw+" is not available");
                                    oReplacementStore[sPartID] = "";
                                }
                            }catch(err){
                                console.warn("oParams",oParams);
                                console.warn(err);
                                console.warn("Error occured with:",sPartIDRaw);
                                console.warn("Database Item "+sPartIDRaw+" is not available");
                                oReplacementStore[sPartID] = "";                   
                            }                             
                        }       
                        break;
                    default:
                        aReplacementShortList.push(sPartID);                                         
                        if( oReplacementStore[sPartID] == undefined){
                        //Part originates in S3 part folder          
                            const oParams = { Bucket: sOriginBucket, Key: 'part/'+sPartID };                        
                            try{
                                const newData = await s3.send(new GetObjectCommand(oParams));  
                                oReplacementStore[sPartID] = await streamToString(newData.Body);
                            }catch(err){
                                console.warn("File 'part/'"+sPartID+" is not available");
                                oReplacementStore[sPartID] = "";
                            }                            
                        }
                        break;
                }

            //return content of global variable
            if(oReplacementStore[sPartID+"_"+sCurrentLang]!=undefined){return(oReplacementStore[sPartID+"_"+sCurrentLang]);}
            if(oReplacementStore[sPartID] == undefined){
                return('');
            }
            return(oReplacementStore[sPartID]);
        }

       /**
         * @function HOK_processIfAttributes
         * 
         * handles <if></if> replacements
         * 
         * @param {string} sInputHTML   HTML
         * @param {string} sFilename    Name of target HTML file
         * 
         * @return <string>    resolved HTML
         */
        async function HOK_processIfAttributes(sInputHTML, sFilename){
            //Find Start
            let iStart = sInputHTML.indexOf("<if>");
            while(iStart > -1){ //while there are more of these commands in the code
                //Find End
                const iEnd = sInputHTML.indexOf("</if>"); 
                //Write everything before start                
                let sOutputHTML = sInputHTML.slice(0, iStart);
                //Process Statement
                    const sIfStatement = sInputHTML.slice(iStart+4, iEnd);
                    const oIfStatement = JSON.parse(sIfStatement);
                    const aMet = [];
                    if(oIfStatement.env!=undefined){
                        if( oIfStatement.env.toLowerCase() == sEnv.toLowerCase() ){
                            aMet.push(true);
                        } else {
                            aMet.push(false);
                        }
                    }
                    if(oIfStatement.file!=undefined){
                        if( oIfStatement.file.toLowerCase() == sFilename ){
                            aMet.push(true);
                        } else {
                            aMet.push(false);
                        }
                    }                    
                    let bMet = true;
                    if(aMet.includes(false)){bMet=false;}
                    if(oIfStatement.not!=undefined){
                        if(oIfStatement.not){
                            if(bMet == true){
                                bMet = false;
                            } else {
                                bMet = true;
                            }
                            
                        }
                    }                    
                    if(bMet){
                        sOutputHTML += oIfStatement.template;
                    }
                //Write everything after end
                sOutputHTML += sInputHTML.slice(iEnd+5);
                //Look for next                
                sInputHTML = sOutputHTML;
                //Find next Start
                iStart = sInputHTML.indexOf("<if>");
            }
            return(sInputHTML);
        }

       /**
         * @function HOK_processLangAttributes
         * 
         * handles <lang></lang> and <switchlang></switchlang> replacements
         * 
         * @param {string} sInputHTML   HTML
         * @param {object} oItem        Item to process (rather than read it
         *                              from file), default null
         * @param {string} sFilename    key of target file, default null
         * 
         * @return <string>    resolved HTML
         */
        async function HOK_processLangAttributes(sInputHTML, oItem = null, sFilename = null){
            //Find Start
            let iStart = sInputHTML.indexOf("<lang>");
            while(iStart > -1){ //while there are more of these commands in the code
                //Find End
                const iEnd = sInputHTML.indexOf("</lang>"); 
                //Write everything before start                
                let sOutputHTML = sInputHTML.slice(0, iStart);
                //Process Statement
                    const sContentOfCommand = sInputHTML.slice(iStart+6, iEnd);
                    if( sContentOfCommand == "2" ){
                        sOutputHTML += sCurrentLang;
                    }else if( sContentOfCommand == "baseurl" ){
                        sOutputHTML += sCurrentURL;
                    }
                //Write everything after end
                sOutputHTML += sInputHTML.slice(iEnd+7);
                //Look for next                
                sInputHTML = sOutputHTML;
                //Find next Start
                iStart = sInputHTML.indexOf("<lang>");
            }
            
            iStart = sInputHTML.indexOf("<switchlang>");
            while(iStart > -1){ //while there are more of these commands in the code
                //Find End
                const iEnd = sInputHTML.indexOf("</switchlang>"); 
                //Write everything before start                
                let sOutputHTML = sInputHTML.slice(0, iStart);
                //Process Statement
                    const sContentOfCommand = sInputHTML.slice(iStart+11, iEnd);
            
                    let iStart2 = sContentOfCommand.indexOf("<"+sCurrentLang+">");
                    const iEnd2 = sContentOfCommand.indexOf("</"+sCurrentLang+">"); 
                    sOutputHTML += sContentOfCommand.slice(iStart2+4, iEnd2);

                //Write everything after end
                sOutputHTML += sInputHTML.slice(iEnd+13);
                //Look for next                
                sInputHTML = sOutputHTML;
                //Find next Start
                iStart = sInputHTML.indexOf("<switchlang>");
            }            
            
            return(sInputHTML);
        }

       /**
         * @function HOK_processPartAttributes
         * 
         * handles <part></part> and <dbpart></dbpart> replacements
         * 
         * @param {string} sInputHTML   HTML
         * @param {object} oItem        Item to process (rather than read it
         *                              from file), default null
         * @param {string} sFilename    key of target file, default null
         * 
         * @return <string>    resolved HTML
         */
        async function HOK_processPartAttributes(sInputHTML, oItem = null, sFilename = null){
            for(let i=0;i<aReplaceCommands.length;i++){ //for all commands to be replaced
                let iStart = sInputHTML.indexOf("<"+aReplaceCommands[i]+">");
                while(iStart > -1){ //while there are more of these commands in the code
                    const iEnd = sInputHTML.indexOf("</"+aReplaceCommands[i]+">"); 
                    let sOutputHTML = sInputHTML.slice(0, iStart);
                    sOutputHTML += await HOK_getPartHTML(sInputHTML.slice(iStart+aReplaceCommands[i].length+2, iEnd),aReplaceCommandsDB[i],oItem);
                    sOutputHTML += sInputHTML.slice(iEnd+aReplaceCommands[i].length+3);
                    sInputHTML = sOutputHTML;
                    iStart = sInputHTML.indexOf("<"+aReplaceCommands[i]+">");
                }
            }
            //handles <if></if> replacements
            if(sFilename!=null){
                sInputHTML = await HOK_processIfAttributes(sInputHTML, sFilename);                            
            }
            return(sInputHTML);
        }
        
        /**
         * @function HOK_handlemultifile
         * 
         * Creates an export file for each DB element.
         * 
         * @param sHTML         <string>    XML entity "<dbmultifile>...
         *                                  </dbmultifile>" to process (resolve)
         * @param sFilename     <string>    
         * @param sOriginKey    <string>    Name of origin file with path. Must
         *                                  be iunside sOriginBucket. When
         *                                  processing a dbmultifile, this is
         *                                  the template.
         * 
         * @return  true - if successfull
         *          false - if html doesn't start with <dbmultifile>
         */    
        async function HOK_handlemultifile(sHTML, sFilename, sOriginKey){
            if(!sHTML.startsWith("<dbmultifile>")){return false;}
            
            //get all files, that have already been generated from this template
        	    let oScanParams2 = {
        			TableName:sHtmlPartElementTable,
        			FilterExpression:"template = :val",
        			ExpressionAttributeValues:{":val":{S:sOriginKey}}
        		};
                const aScanResultBefore = await HOK_scanTable(ddb,oScanParams2);            
                let aFiles = [];
                for(let i=0;i<aScanResultBefore.length;i++){
                    aFiles.push(aScanResultBefore[i].source.S);
                }
                aFiles = [...new Set(aFiles)];
            
            //write an export file for each database entry
                const sReplacementHTML = sHTML.slice(13,sHTML.indexOf("</dbmultifile>"));
                const oReplacementHTML = JSON.parse(sReplacementHTML);
        
        	    let oScanParams = {
        			TableName:sWebinyContentTable,
        			FilterExpression:"",
        			ExpressionAttributeNames:{},
        			ExpressionAttributeValues:{}
        		};
        		for(let i=0;i<oReplacementHTML.filter.length;i++){
        		    oScanParams.FilterExpression = oScanParams.FilterExpression + "#attr"+i+" = :val"+i;
        		    const sKey = Object.keys(oReplacementHTML.filter[i])[0];
        		    const oContent = oReplacementHTML.filter[i][sKey];
        		    oScanParams.ExpressionAttributeNames["#attr"+i] = sKey; 
        		    oScanParams.ExpressionAttributeValues[":val"+i] = oContent;
        		}
                const aScanResult = await HOK_scanTable(ddb,oScanParams);
        
                for(let i=0; i<aScanResult.length; i++){
                    //Create Filename
                        let sSuffix ="";
                        if(aScanResult[i][oReplacementHTML.filenamesuffix].S!=undefined){sSuffix = aScanResult[i][oReplacementHTML.filenamesuffix].S} else
                        if(aScanResult[i][oReplacementHTML.filenamesuffix].N!=undefined){sSuffix = aScanResult[i][oReplacementHTML.filenamesuffix].N}
                        const iFileSuffixStart = sFilename.lastIndexOf(".");
                        const sFilenameNew = sFilename.slice(0,iFileSuffixStart) + "-"+ sSuffix + sFilename.slice(iFileSuffixStart);
                    //Generate File
                        await HOK_updateWebsiteFile(sFilenameNew,sOriginKey,true,aScanResult[i]);
                    //Mark as generated in List
                        await HOK_poplastfitting(aFiles, sFilenameNew);
                }

            //delete all files, that have already been generated from this template, but weren't updated (according DB entry was deleted)
                for(let i=0;i<aFiles.length;i++){
                    const oParams = {
                        Bucket: sDestBucket,
                        Key: aFiles[i]
                    };
                    await s3.send(new DeleteObjectCommand(oParams));

            		const oParamsDDB = {
                        TableName: sHtmlPartElementTable,
                        KeyConditionExpression : "#attr = :val",
            			ExpressionAttributeNames:{
            			    '#attr':'source'
            			},
                        ExpressionAttributeValues : {
                            ':val' : {"S":aFiles[i]}
                        } 
            		};
                    const oData = await ddb.send(new QueryCommand(oParamsDDB));
                    for(let j=0;j<oData.Items.length;j++){
                        const oParams = {
                			TableName:sHtmlPartElementTable,
                			"Key": {
                			    source: oData.Items[j].source,
                			    part: oData.Items[j].part                			    
                			}	
                		};
                		await ddb.send(new DeleteItemCommand(oParams));
                    }

                }
            
            return true;
        }        
        
        /**
         * @function HOK_getPosition
         * 
         * Returns the nth occurence of a substring
         * 
         * @param string    <string>    Haystack
         * @param subString <string>    Needle
         * @param index     <int>       Start index of search
         * 
         * @return <int>    Index of needle
         */
        async function HOK_getPosition(string, subString, index) {
            return string.split(subString, index).join(subString).length;
        }        
        
       /**
         * @function HOK_formatDate
         * 
         * Converts Unix timestamp to mm/dd/yyyy or dd.mm.yyyy
         * 
         * @param {int}     iDate   Unix Timestamp
         * @param {string}  sCurrentLang "de" for dd.mm.yyyy, else mm/dd/yyyy
         * 
         * @return {string} formatted date
         */
        async function HOK_formatDate(iDate,sCurrentLang){
            if(iDate<1000000000000){iDate=iDate*1000}
            let date = new Date(iDate);
            let year = date.getFullYear();
            let month = date.getMonth()+1;
            let dt = date.getDate();
    
            if (dt < 10) {
            dt = '0' + dt;
            }
            if (month < 10) {
            month = '0' + month;
            }
            let retval = month + '/' + dt + '/' + year;
            if(sCurrentLang=="de"){
                retval = dt+'.' + month + '.'+year;
            }
            return retval;
        }        
        
        /**
         * @function HOK_process_dynamic_from_item
         * 
         * Takes an object and an identifier. Returns string that is content of
         * object at indetifier.
         * 
         * @param oItem     <object>    Item to process (rather than read it
         *                              from file)
         * @param sCommand  <string>    Serialized object with processing command:
         *                               - limit: cut off after limit characters
         *                               - limitlow: need limit to be set, cut
         *                                      off after random characters
         *                                      between limitlow and limit.
         *                               - format: if it is =="date", content
         *                                      will be reformatted as date
         *                               - divide: content will be divided
         *                               - <fieldname>: The item ("N" or "S")
         *                                      will be retrurned.
         * 
         * @return sResult  <string>    Processed item conetent
         */         
        async function HOK_process_dynamic_from_item(oItem, sCommand){
            let sResult = "";
            
            if(sCommand[0] =="{"){
                //If is object with instructions
                const oCommand=JSON.parse(sCommand);
                
                    //If command is "limit"
                        if(oCommand.limit!=undefined){
                            let iTextLength = oCommand.limit;
                            if(oCommand.limitlow!=undefined){
                                iTextLength = (Math.random()*oCommand.limit)+oCommand.limitlow;                    
                            }
                            let iBaseLength = oItem[oCommand.field].S.length;
                            let sParen="";
                            if(iTextLength==0 || iTextLength>iBaseLength){iTextLength = iBaseLength;}else{sParen="..."}
                            sResult += await HOK_fixHtml(oItem[oCommand.field].S.slice(0,iTextLength)+sParen);            
                        } else if(oCommand.format!=undefined){
                    //If command is format
                        if(oCommand.format=="date"){
                            sResult += await HOK_formatDate(oItem[oCommand.field].N,oCommand.locale);
                        } }else if(oCommand.divideattag!=undefined){
                    //If command is divide
                            const sContentToDivide = oItem[oCommand.field].S;
                            
                            let iPositionStart = 0;
                            if(oCommand.startnumber!=undefined){
                                iPositionStart = await HOK_getPosition( sContentToDivide, oCommand.divideattag, oCommand.startnumber );
                            }
                            let iPositionEnd = oItem[oCommand.field].S.length;
                            if(oCommand.endnumber!=undefined){
                                iPositionEnd = await HOK_getPosition( sContentToDivide, oCommand.divideattag, oCommand.endnumber );
                            }
                            sResult += oItem[oCommand.field].S.slice(iPositionStart,iPositionEnd);
                        }
                    } else {
                //If command is fieldname
                        if(oItem[sCommand].S!=undefined){sResult = oItem[sCommand].S;}
                        if(oItem[sCommand].N!=undefined){sResult = oItem[sCommand].N;}
                    }
            
            return sResult;
        }         
        
        /**
         * @function HOK_processPartAttributesfromDynamic
         * 
         * Handles "<dbmultifileitem>" Tags
         * 
         * @param sInputHTML    <string>    HTML content to process
         * @param oItem         <object>    Item to process (rather than read it
         *                                  from file)
         * 
         * @return sOutputHTML  <string>    Processed HTML content
         */         
        async function HOK_processPartAttributesfromDynamic(sInputHTML, oItem){
            let sOutputHTML = "";
            const start = sInputHTML.indexOf("<dbmultifileitem>");
            if (start > -1){
                sOutputHTML += await sInputHTML.slice(0, start);  
    
                const end = sInputHTML.indexOf("</dbmultifileitem>");
                sOutputHTML += await HOK_process_dynamic_from_item(oItem,sInputHTML.slice(start+("<dbmultifileitem>".length),end));
    
                sOutputHTML += await sInputHTML.slice(end+("</dbmultifileitem>".length)); 
            }else{
                sOutputHTML += sInputHTML;        
            }
            
            const start2 = sOutputHTML.indexOf("<dbmultifileitem>");
            if (start2 > -1){
                sOutputHTML = await HOK_processPartAttributesfromDynamic(sOutputHTML,oItem);
            }

            return(sOutputHTML);        
        }           
        
        /**
         * @function HOK_updateWebsiteFile
         * 
         * Triggers the update of a certain file from the "website" folder by 
         * iterating through its' special tags
         * 
         * @param sFilename         <string>                    Name of target file
         * @param sOriginKey        <string>                    Name of origin file with path. Must be iunside sOriginBucket. When processing a dbmultifile, this is the template.
         * @param bSkipMultiCheck   <bool>      Default: false  Set true, if you don't want to process multiple, subsecuent files 
         * @param oItem             <object>    Default: null   Item to process (rather than read it from file)
         * 
         * @return always null
         */
        async function HOK_updateWebsiteFile(sFilename, sOriginKey, bSkipMultiCheck=false, oItem=null){
            //Reset buffer for parts used in this template file
                aReplacementShortList = [];

            //Detect if file is a text file (then proceed processing it) or a different file tpye (then just copy it - Usecase: favicon)
                const oFile = await s3.send(new GetObjectCommand({ Bucket: sOriginBucket, Key: sOriginKey }));
                if(oFile.ContentType != 'text/html'){
                    let oParams = {
                        CopySource: record.s3.bucket.name + '/' + sOriginKey,
                        Bucket: sDestBucket,
                        Key: sFilename,
                        ACL: 'public-read'
                    };
                    await s3.send(new CopyObjectCommand(oParams));
                    return null;
                }
                
            //Read file content
                const sFileContent = await streamToString(oFile.Body);
          
            //Handle, html commands

                //handles one file per db element commands        
                    if(!bSkipMultiCheck){
                        if(await HOK_handlemultifile(sFileContent,sFilename,sOriginKey)){return null}
                    }


                //handles <if></if> replacements                
                    let newHTML = await HOK_processIfAttributes(sFileContent, sFilename);
                
                //handles <fileattribute></fileattribute> replacements                
                    newHTML = await HOK_processFileAttributes(newHTML, sFilename);
          
                //handles <part></part>, <dbpart></dbpart> and <dbmulti></dbmulti> replacements
                    newHTML = await HOK_processPartAttributes( newHTML, oItem, sFilename ); 

                //handles <lang></lang> replacements
                    newHTML = await HOK_processLangAttributes( newHTML, oItem, sFilename ); 

                //handles dbmultifileitem tags        
                    if(oItem != null){
                        newHTML = newHTML.slice(newHTML.indexOf("</dbmultifile>")+14);
                        newHTML = (await HOK_processPartAttributesfromDynamic(newHTML,oItem));
                    }

            //Minify HTML
                newHTML = (await HOK_minifyHTML(newHTML));
                await s3.send(new PutObjectCommand({ 
                    Body: newHTML, 
                    Bucket: sDestBucket, 
                    Key: sFilename, 
                    ACL: 'public-read',  
                    ContentType: 'text/html'
                }));
                await HOK_writePartUseage(aReplacementShortList, sVariant+":"+sFilename, sOriginKey);
            return null;
        }

       /**
         * @function HOK_updateItemFromDB
         * 
         * Handles writing/updating and deleting an item, if the source is DDB
         * (gets all website html files, where DB Item is used and updates the
         * content of all these files)
         * 
         * @param {object} oItem    DB item that was updated
         * 
         * @return      <int>       0
         *                          or error object
         */        
        async function HOK_updateItemFromDB(oItem){
            //determine, if it is a unique (has contentid) field, or general item
                let sID="";
                if(oItem.contentid.S == oItem.id.S){sID=sWebinyContentTable}else{sID="ddb_"+oItem.contentid.S}

            //get all website html files, where DB Item is used and update the content of all these files
        		let oParams = {
        			TableName:sHtmlPartElementTable,
        			FilterExpression: '#attr = :val',
        			ExpressionAttributeNames:{
        		    	"#attr": "part"
        			},
        			ExpressionAttributeValues: { 
        				':val': {"S":sID}
        			}		
        		};
                try {   
                    //Get allm affected files
            		const aData = await HOK_scanTable(ddb,oParams);
                    //For each affected file            		
                    for(let i=0;i<aData.length;i++){
            		    //Read config according to source prefix
            		        //Get source prefix
            		        sVariant = aData[i].source.S.substring(0,aData[i].source.S.indexOf(':'));
            		        const aLangs = oConfig[sVariant]; 
            		        //For all languages
                            for (let j=0;j<aLangs.length;j++){
                                //Set lang
                                const aLang = aLangs[j];
                                sCurrentLang = Object.keys(aLang)[0];
                                //Set Destination Bucket
                                sDestBucket = aLang[sCurrentLang].bucket;
                                //Set Source Bucket
                                const iInsertPoint = sDestBucket.indexOf('-',sDestBucket.indexOf('-')+1)+1;
                                sOriginBucket = sDestBucket.substring(0,iInsertPoint);
                                sOriginBucket += "code-";
                                sOriginBucket += sDestBucket.substring(iInsertPoint);
                                const iDSeletetPoint = sOriginBucket.split("-").length-1;
                                if(iDSeletetPoint>3){
                                    sOriginBucket = sOriginBucket.substring(0,sOriginBucket.lastIndexOf('-'));
                                }
                                //Update the affected file
                                await HOK_updateWebsiteFile(aData[i].template.S.slice(8), aData[i].template.S);
                            }
                    }             		
                }catch(err){
                    console.warn("error in 'HOK_writeItemFromDB' with params:",oParams, err);
                    throw(err);                    
                }

            return 0;
        }

       /**
         * @function HOK_updateItemFromS3
         * 
         * Handles writing/updating an item, if the source is S3 (If ist's a
         * "part" file, it gets all website html files, where the part file 
         * is used and updates the content of all these files. If it's a
         * website file it updates itself.)
         * Skips, if file is a folder.
         * 
         * @param {string} sFilekeyFull Key of the S3 file that changed
         * @param {bool} bDelete        true if it is a delete operation, default: false
         * 
         * @return      <int>       0
         *                          or error object
         */        
        async function HOK_updateItemFromS3(sFilekeyFull,bDelete=false){

            //Read context from S3
            sOriginBucket = record.s3.bucket.name;
            const iStart = record.s3.bucket.name.indexOf('-')+1;
            const iEnd = record.s3.bucket.name.indexOf('-',iStart);
            sVariant = record.s3.bucket.name.substring(iStart,iEnd);

            const aLangs = oConfig[sVariant];

            for (let i=0;i<aLangs.length;i++){

                const aLang = aLangs[i];
                sCurrentLang = Object.keys(aLang)[0];
                sDestBucket = aLang[sCurrentLang].bucket;
                if(sFilekeyFull.indexOf(".") != -1){ //If not a folder

                    if (sFilekeyFull.localeCompare("website/") > 0 || sFilekeyFull.localeCompare("app/") > 0) {  // If file is from folder "website" or "app"

                        let sFilename = "";                        
                        if (sFilekeyFull.localeCompare("website/") > 0) {
                            sFilename = sFilekeyFull.slice("website/".length);
                        } else {
                            sFilename = sFilekeyFull.slice("app/".length);
                        }

                        
                        if(bDelete){
                            const oParams = {
                                Bucket: sDestBucket,
                                Key: sFilename
                                };
                            
                            //delete 1:1 clone in output bucket
                                await s3.send(new DeleteObjectCommand(oParams));
                                await HOK_writePartUseage([], sVariant+":"+sFilename, sFilekeyFull);
                            
                            //delete 1:n clones in output bucket                        
                        		const oParams2 = {
                        			TableName:sHtmlPartElementTable,
                        			FilterExpression: '#attr = :val',
                        			ExpressionAttributeNames:{
                        		    	"#attr": "template"
                        			},
                        			ExpressionAttributeValues: { 
                        				':val': {"S":sFilekeyFull}
                        			}		
                        		};
                        		const aData = await HOK_scanTable(ddb,oParams2);
                                for(let i=0;i<aData.length;i++){
                                    const oParams3 = {
                                        Bucket: sDestBucket,
                                        Key: aData[i].source.S
                                    };
                                    await s3.send(new DeleteObjectCommand(oParams3));
                                    await HOK_writePartUseage([], sVariant+":"+aData[i].source.S, sFilekeyFull);
                                }                          
                        } else {                
                            await HOK_updateWebsiteFile(sFilename, sFilekeyFull);                        
                        }
                        
                    } else if (sFilekeyFull.localeCompare("part/") > 0) { // If file is from folder "part"
                        //update each "website" file, the current  part file was used inside
                            const sFilename = sFilekeyFull.slice("part/".length);                    
                    		const oParams = {
                    			TableName:sHtmlPartElementTable,
                    			FilterExpression: '#attr = :val',
                    			ExpressionAttributeNames:{
                    		    	"#attr": "part"
                    			},
                    			ExpressionAttributeValues: { 
                    				':val': {"S":sFilename}
                    			}		
                    		};
                    		const aData = await HOK_scanTable(ddb,oParams);
                            for(let i=0;i<aData.length;i++){
                                await HOK_updateWebsiteFile(aData[i].template.S.slice(8), aData[i].template.S);
                            }
                        
                    }
                }                
                
            }
            return 0;
        }
            
       /**
         * @function HOK_minifyHTML
         * 
         * minifies HTML string
         * 
         * @param sHTML    <string>    HTML
         * 
         * @return <string>    minified HTML
         */        
        async function HOK_minifyHTML(sHTML){
            //Step 1 : Remove HTML Comments
                sHTML = await HOK_removeHTMLComments(sHTML);
            //Step 2 : Process CSS
                sHTML = await HOK_minifyCSS(sHTML,0);
            //Step 3 : Process anything but JS
                sHTML = await HOK_minifyAll(sHTML,0);
            return(sHTML);
        }        
        
       /**
         * @function HOK_removeHTMLComments
         * 
         * removes comments from HTML string
         * 
         * @param sHTML    <string>    HTML
         * 
         * @return <string>    comment free HTML
         */               
        async function HOK_removeHTMLComments(sHTML){
            const start = sHTML.indexOf("<!--");
            if (start > -1){
                let end = sHTML.indexOf("-->",start); 
                let outputHTML = await sHTML.slice(0, start);
                outputHTML += await sHTML.slice((end+3));
                sHTML = await HOK_removeHTMLComments(outputHTML);
            }
            return sHTML;
        }
    
       /**
         * @function HOK_removeCSSComments
         * 
         * removes comments from CSS string
         * 
         * @param sHTML    <string>    HTML
         * 
         * @return <string>    comment free HTML
         */    
        async function HOK_removeCSSComments(sHTML){
            let start = sHTML.indexOf("/*");
            if (start > -1){
                let end = sHTML.indexOf("*/",start); 
                let outputHTML = await sHTML.slice(0, start);
                outputHTML += await sHTML.slice((end+2));
                sHTML = await HOK_removeCSSComments(outputHTML);
            }
            return sHTML;
        }
    
       /**
         * @function HOK_removeJSComments
         * 
         * removes comments from JS string
         * 
         * @param sHTML    <string>    HTML
         * 
         * @return <string>    comment free HTML
         */        
        async function HOK_removeJSComments(sHTML,iLastIndex=0){
            let start = sHTML.indexOf("/*",iLastIndex);
            if (start > -1){
                let end = sHTML.indexOf("*/",start);
                let sHTML2 = sHTML.slice(0, start);
                sHTML2 += sHTML.slice(end+2);
                sHTML = await HOK_removeJSComments(sHTML2);
            }
            
            start = sHTML.indexOf("//",iLastIndex);
            if(sHTML[start-1]==" "){
                if (start > -1){
                    let end = sHTML.indexOf("\n",start);
                    let sHTML2 = sHTML.slice(0, start);
                    sHTML2 += sHTML.slice(end+2);
                    sHTML = await HOK_removeJSComments(sHTML2);
                }
            }
            return sHTML;
        }    
    
       /**
         * @function HOK_minifyCSS
         * 
         * removes comments from style elements inside HTML string
         * 
         * @param sHTML    <string>    HTML
         * 
         * @return <string>    comment free HTML
         */       
        async function HOK_minifyCSS(sHTML,iLastIndex){
            let start = sHTML.indexOf("<style>",iLastIndex);
            if (start > -1){
                let end = sHTML.indexOf("</style>",start); 
                let outputHTML = await sHTML.slice(0, start+7);
                outputHTML += await HOK_removeCSSComments(sHTML.slice(start+7, end));
                outputHTML += await sHTML.slice((end));
                sHTML = await HOK_minifyCSS(outputHTML,end+8);
            }
            return sHTML;
        }            

       /**
         * @function HOK_minifyAll
         * 
         * removes whitespace and line breaks
         * 
         * @param sHTML    <string>    HTML
         * 
         * @return <string>    comment free HTML
         */                
        async function HOK_minifyAll(sHTML,iLastIndex=0){
            let start = sHTML.indexOf("<script>",iLastIndex);
            if (start > -1){
                let end = sHTML.indexOf("</script>",start); 
                let outputHTML = await HOK_removeWhitespaces(sHTML.slice(0, start));
                outputHTML += await HOK_removeJSComments(sHTML.slice(start,end+9));
                let iNewStart = outputHTML.length;
                outputHTML += sHTML.slice(end+9);
                if(iNewStart<outputHTML.length){
                    sHTML = await HOK_minifyAll(outputHTML,iNewStart);                
                }
                sHTML = outputHTML;
            } else {
                sHTML = sHTML.slice(0,iLastIndex) + await HOK_removeWhitespaces(sHTML.slice(iLastIndex));
            }
            return sHTML;
        }

       /**
         * @function HOK_removeWhitespaces
         * 
         * removes whitespace and line breaks from String
         * 
         * @param sHTML    <string> Input
         * 
         * @return <string>         Input stripped by whitespace and linebreak   
         */                            
        async function HOK_removeWhitespaces(sHTML){
            return sHTML.replace(/\s+/g, ' ');
        }            

       /**
         * @function HOK_poplastfitting
         * 
         * removes last fitting element from an array
         * 
         * @param a         <array> Array with the element to remove
         * @param target    <*>     Element to remove 
         * 
         * @return <array>  Array with one element less
         */      
        async function HOK_poplastfitting(a, target) {
            for(let i=a.length;i>=0;i--){
                if(a[i]==target){
                    a.splice(i, 1); 
                }
            }
            return a;
        }
        
       /**
         * @function HOK_fixHtml
         * 
         * closes open Tags
         * 
         * @param sHtml <string> HTML Fragment to fix
         * 
         * @return sReturn <string> Valid HTML
         */    
        async function HOK_fixHtml(sHtml){
            // cut unfinished (open) tags at end of string
                const iPosLastOpenTag = sHtml.lastIndexOf("<");
                const iPosLastCloseTag = sHtml.lastIndexOf(">");
                if (iPosLastOpenTag > iPosLastCloseTag){
                    sHtml = sHtml.slice(0,iPosLastOpenTag);
                }
            
            //close open tags
                let aMatches = sHtml.match(/<\/?[a-z][^>]*>/ig);
                let aTags = [];        
                for(let i=0;i<aMatches.length;i++){
                    //Analyze tag
                        //cut off end of Tag
                            const aMatchDetail = aMatches[i].split(" "); 
                            let sMatchDetail = aMatchDetail[0];
                            if(sMatchDetail[sMatchDetail.length-1]==">"){sMatchDetail = sMatchDetail.slice(0,sMatchDetail.length-1)}
                        //cut off beginnign of Tag
                            sMatchDetail = sMatchDetail.slice(1);
        
                        if( sMatchDetail[0] == "/" ){
                            sMatchDetail = sMatchDetail.slice(1);
                            aTags = await HOK_poplastfitting(aTags, sMatchDetail);
                        }else{
                            aTags.push(sMatchDetail);
                        }
                }
                for(let i=aTags.length-1; i>=0;i--){
                    sHtml += "</"+aTags[i]+">";
                }
                
            return(sHtml);
        }  

    /** "MAIN" */
        try{
            //For each record            
            for (var record of event.Records) {
                switch(record.eventSource){                    
                    case "aws:dynamodb":
                        if(record.eventName == 'REMOVE'){
                            try{ await HOK_updateItemFromDB(record.dynamodb.OldImage)} catch(err){throw(err);}
                        } else {
                            try{ await HOK_updateItemFromDB(record.dynamodb.NewImage)} catch(err){throw(err);}
                        }
                    break;
                    case "aws:s3":
                        if(record.eventName.startsWith("ObjectRemoved")){
                            try{ await HOK_updateItemFromS3(record.s3.object.key, true)} catch(err){throw(err);}
                        } else {
                            try{ await HOK_updateItemFromS3(record.s3.object.key)} catch(err){throw(err);}
                        }    
                    break;
                }
            }
        } catch(err){
            console.log("err",err);
            throw(err);
        }
        
        return 0;

};