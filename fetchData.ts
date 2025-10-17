import https from 'https';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const __RESOURCES_ID = "resource_nodes";
const __COLLECTIBLES_ID = "collectibles";
const __ARTIFACTS_ID = "artifacts";
const __WELLS_ID = "resource_wells";

interface MapMarker {
    x: number;
    y: number;
    z: number;
}

interface InnerOption {
    layerId?: string;
    name?: string;
    purity?: number;
    markers?: MapMarker[];
}

interface NodeOption {
    name?: string;
    type?: string;
    options: any[];
}

interface MapOption {
    tabId?: string;
    name?: string;
    options: NodeOption[];
    button?: boolean
}

// Type definitions for the API response
interface MapData {
    lastBuild: string;
    version: number;
    options?: any[];
}

interface Node {
    name: string;
    purity?: number;
    location: {
        x: number;
        y: number;
        z: number;
    }
}

interface FinalData {
    version: number;
    lastBuild: string;
    resources: Node[];
    collectibles: Node[];
    artifacts: Node[];
    wells: Node[];
}

const PURITY_MAP: Record<string, number> = {
    impure: 1,
    normal: 2,
    pure: 3
};

function normalizePurity(purity?: string): number | undefined {
    if (!purity) return undefined;
    const normalized = purity.toLowerCase();
    return PURITY_MAP[normalized];
}

function collectNodesFromOption(option: any, fallbackName?: string): Node[] {
    if (!option) return [];

    const nodes: Node[] = [];
    const optionName = option.name ?? fallbackName ?? 'Unknown';

    if (Array.isArray(option.markers)) {
        option.markers.forEach((marker: any) => {
            if (
                typeof marker?.x === 'number' &&
                typeof marker?.y === 'number' &&
                typeof marker?.z === 'number'
            ) {
                const purity = normalizePurity(marker.purity ?? option.purity);
                nodes.push({
                    name: optionName,
                    ...(purity !== undefined ? { purity } : {}),
                    location: {
                        x: marker.x,
                        y: marker.y,
                        z: marker.z
                    }
                });
            }
        });
    }

    if (Array.isArray(option.options)) {
        option.options.forEach((child: any) => {
            nodes.push(...collectNodesFromOption(child, optionName));
        });
    }

    return nodes;
}

function extractNodesByTab(tabId: string, data: MapData): Node[] {
    const tab = data.options?.find((opt: MapOption) => opt.tabId === tabId);
    if (!tab || !Array.isArray(tab.options)) return [];

    const nodes: Node[] = [];
    tab.options.forEach((option: any) => {
        nodes.push(...collectNodesFromOption(option, option.name ?? tab.name));
    });

    return nodes;
}

function GetData(): Promise<MapData> {
    return new Promise((resolve, reject) => {
        const url = 'https://static.satisfactory-calculator.com/data/json/mapData/en-Stable.json?v=1759732267';

        const options = {
            headers: {
                'sec-ch-ua-platform': '"macOS"',
                'Referer': 'https://satisfactory-calculator.com/',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'sec-ch-ua': '"Brave";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
                'sec-ch-ua-mobile': '?0'
            }
        };

        console.log('Fetching data from:', url);

        https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk: Buffer) => {
                data += chunk.toString();
            });

            res.on('end', () => {
                try {
                    // Parse JSON to validate it
                    const jsonData: MapData = JSON.parse(data); 
                    resolve(jsonData);
                } catch (error) {
                    console.error('✗ Error parsing or saving JSON:', (error as Error).message);
                    reject(error);
                }
            });
        }).on('error', (error: Error) => {
            console.error('✗ Error fetching data:', error.message);
            reject(error);
        });
    });
}

function getInfoFromData(target: string, data: MapData): MapOption | null {
    if (!data) return null;
    
    // Find the option matching the target type
    const option = data.options?.find(opt => opt.type === target);
    return option || null;
}

function ParseData(data: MapData): FinalData {
    if (!data) {
        throw new Error('No data provided to ParseData');
    }
    
    const finalData: FinalData = {
        version: data.version || -1,
        lastBuild: data.lastBuild || 'unknown',
        resources: [],
        collectibles: [],
        artifacts: [],
        wells: []
    };

    finalData.resources = extractNodesByTab(__RESOURCES_ID, data);
    finalData.collectibles = extractNodesByTab(__COLLECTIBLES_ID, data);
    finalData.artifacts = extractNodesByTab(__ARTIFACTS_ID, data);
    finalData.wells = extractNodesByTab(__WELLS_ID, data);
    

    return finalData;
}

// Main execution
async function main() {
    try {
        const data = await GetData();
        const parsedData = ParseData(data);

        const outputDir = path.join(__dirname, 'static', 'data');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const writeJSON = (fileName: string, payload: unknown) => {
            const outputPath = path.join(outputDir, fileName);
            fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
            return outputPath;
        };

        const resourcesPath = writeJSON('resources.json', parsedData.resources);
        const collectiblesPath = writeJSON('collectibles.json', parsedData.collectibles);
        const artifactsPath = writeJSON('artifacts.json', parsedData.artifacts);
        const wellsPath = writeJSON('wells.json', parsedData.wells);
        const metadataPath = writeJSON('metadata.json', {
            version: parsedData.version,
            lastBuild: parsedData.lastBuild
        });

        console.log('✓ Data parsed successfully');
        console.log(`  - Resources: ${parsedData.resources.length}`);
        console.log(`  - Collectibles: ${parsedData.collectibles.length}`);
        console.log(`  - Artifacts: ${parsedData.artifacts.length}`);
        console.log(`  - Wells: ${parsedData.wells.length}`);
        console.log('✓ Files written to static/data:');
        console.log(`  - ${resourcesPath}`);
        console.log(`  - ${collectiblesPath}`);
        console.log(`  - ${artifactsPath}`);
        console.log(`  - ${wellsPath}`);
        console.log(`  - ${metadataPath}`);
        
    } catch (error) {
        console.error('✗ Error in main execution:', (error as Error).message);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { GetData, ParseData, getInfoFromData };
export type { MapData, MapOption, MapMarker, FinalData };
