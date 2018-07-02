import * as AWS from 'aws-sdk';
import {
  DatapointValues,
  GetMetricDataInput,
  GetMetricDataOutput,
  MetricDataQuery,
  MetricDataResult, Timestamps
} from 'aws-sdk/clients/cloudwatch';
import moment from 'moment';
import { Config } from './interfaces/config';

/**
 * DataLoader
 */
export class DataLoader {

  private cloudWatch: AWS.CloudWatch;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.cloudWatch = new AWS.CloudWatch({apiVersion: '2010-08-01'});
  }

  /**
   * Load metrics data from CloudWatch based on specified configuration
   *
   * @return {Promise<CloudWatch.GetMetricDataOutput>}
   */
  public async load(): Promise<GetMetricDataOutput> {
    const params: GetMetricDataInput = {
      EndTime: moment(this.config.metrics.toDate).toDate(),
      MetricDataQueries: [],
      StartTime: moment(this.config.metrics.fromDate).toDate()
    };

    for (const property of this.config.metrics.properties) {
      const dataQuery: MetricDataQuery = {
        Id: property.id,
        Label: property.label || property.name,
        MetricStat: {
          Metric: {
            Dimensions: [],
            MetricName: property.name,
            Namespace: property.namespace
          },
          Period: (property.periodMinutes || 120) * 60,
          Stat: property.statistic,
          Unit: property.unit
        },
        ReturnData: true
      };

      for (const dimension in property.dimensionSelect) {
        if (property.dimensionSelect.hasOwnProperty(dimension)) {
          for (const value of property.dimensionSelect[dimension]) {
            if (dataQuery.MetricStat && dataQuery.MetricStat.Metric && dataQuery.MetricStat.Metric.Dimensions) {
              dataQuery.MetricStat.Metric.Dimensions.push({
                Name: dimension,
                Value: value
              });
            }
          }
        }
      }

      params.MetricDataQueries.push(dataQuery);
    }


    return this.recursiveDataLoader(params);
  }

  private async recursiveDataLoader(params: GetMetricDataInput, nextToken?: string): Promise<GetMetricDataOutput> {

    if (nextToken) {
      params.NextToken = nextToken;
    } else {
      delete params.NextToken;
    }

    const data = await this.cloudWatch.getMetricData(params).promise();

    if (data.NextToken) {
      const nextDataSet = await this.recursiveDataLoader(params, data.NextToken);
      if (nextDataSet.MetricDataResults) {
        nextDataSet.MetricDataResults.forEach((value: MetricDataResult, index: number) => {
          if (data.MetricDataResults && data.MetricDataResults[index]) {
            if (data.MetricDataResults[index].Values && value.Values) {
              data.MetricDataResults[index].Values = (data.MetricDataResults[index].Values as DatapointValues).concat(value.Values);
            }
            if (data.MetricDataResults[index].Timestamps && value.Timestamps) {
              data.MetricDataResults[index].Timestamps = (data.MetricDataResults[index].Timestamps as Timestamps).concat(value.Timestamps);
            }
          }
        });
      }
    }

    return data;
  }
}