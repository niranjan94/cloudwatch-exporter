import { GetMetricDataOutput } from 'aws-sdk/clients/cloudwatch';
import chalk from 'chalk';
import Table from 'cli-table2';
import * as csv from 'fast-csv';
import { writeFileSync } from 'fs';
import { get, sortBy, sortedUniq } from 'lodash';
import moment from 'moment';
import { Config } from './interfaces/config';

export class OutputFormatter {

  private readonly config: Config;
  private readonly data: GetMetricDataOutput;

  constructor(config: Config, data: GetMetricDataOutput) {
    this.config = config;
    this.data = data;
  }

  /**
   * Output the given data in the specified format
   *
   * @return {Promise<void>}
   */
  public async output(): Promise<void> {
    switch (this.config.output.format) {
      case 'json':
        this.json();
        break;
      case 'table':
        this.table();
        break;
      case 'csv':
        this.csv();
        break;
      default:
        console.log(chalk.red(`Invalid output format '${this.config.output.format}'.`));
    }
  }

  /**
   * Output raw JSON
   */
  private json(): void {
    const serializedData = JSON.stringify(this.data, null, 2);
    if (this.config.output.destination) {
      writeFileSync(this.config.output.destination, serializedData);
    } else {
      console.log(serializedData);
    }
  }

  /**
   * Get grouped and normalized data
   */
  private getNormalizedData(): { normalizedData: any, timestamps: number[] } {
    const normalizedData: any = {};
    let timestamps: number[] = [];

    for (const result of this.data.MetricDataResults || []) {
      if (result && result.Timestamps && result.Values && result.Id) {
        normalizedData[result.Id] = {};
        const normalizedTimestamps = result.Timestamps.map((timestamp, index) => {
          const unixTimestamp = Math.round(timestamp.getTime() / 1000);
          normalizedData[result.Id as string][unixTimestamp] = (result.Values as any[])[index];
          return unixTimestamp;
        });
        timestamps = timestamps.concat(normalizedTimestamps);
      }
    }

    return {
      normalizedData, timestamps: sortedUniq(sortBy(timestamps))
    };
  }

  /**
   * Output data as an ASCII table
   */
  private table(): void {
    const data = this.getNormalizedData();
    const table = new Table({ head: [''].concat(this.config.metrics.properties.map(property => property.label)) });

    for (const timestamp of data.timestamps) {
      const row: any = {};
      row[moment.unix(timestamp).format()] = this.config.metrics.properties.map(property => {
        return get(data.normalizedData, `${property.id}.${timestamp}`, 'N/A') || 'N/A';
      });
      (table as any).push(row);
    }

    const serializedData = table.toString();

    if (this.config.output.destination) {
      writeFileSync(this.config.output.destination, serializedData);
    } else {
      console.log(serializedData);
    }

  }

  private csv(): void {
    if (!this.config.output.destination) {
      console.log(chalk.red('A destination is required for a CSV ouput.'));
      return;
    }
    const csvData = [];
    const data = this.getNormalizedData();

    csvData.push(['Timestamp'].concat(this.config.metrics.properties.map(property => property.label)));

    for (const timestamp of data.timestamps) {
      csvData.push([moment.unix(timestamp).format()].concat(
        this.config.metrics.properties.map(property => {
          return get(data.normalizedData, `${property.id}.${timestamp}`, 'N/A') || 'N/A';
        })
      ));
    }

    csv.writeToPath(
      this.config.output.destination,
      csvData,
      {headers: true}
    );
  }
}