import * as AWS from 'aws-sdk';
import { merge, snakeCase } from 'lodash';
import { DataLoader } from './data-loader';
import { Config } from './interfaces/config';
import { OutputFormatter } from './output-formatter';

export class Exporter {

  private config: Config = {
    aws: {
      region: 'ap-southeast-1'
    },
    metrics: {
      fromDate: '',
      properties: [],
      toDate: ''
    },
    output: {
      format: 'table'
    }
  };

  constructor(config: Config) {
    config.metrics.properties.forEach((property: any, index: number) => {
      property.label = property.label || property.name;
      property.id = snakeCase(property.label + '_' + index);
    });
    merge(this.config, config);
    AWS.config.update(this.config.aws);
  }

  /**
   * Download & Export the database as per configuration
   *
   * @return {Promise<void>}
   */
  public async export(): Promise<void> {
    const loader = new DataLoader(this.config);
    const data = await loader.load();
    const outputFormatter = new OutputFormatter(this.config, data);
    await outputFormatter.output();
  }

}