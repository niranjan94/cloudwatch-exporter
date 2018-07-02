import { StandardUnit } from 'aws-sdk/clients/cloudwatch';
import { APIVersions, ConfigurationOptions } from 'aws-sdk/lib/config';
import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';

export interface Output {
  readonly format: "csv"|"table"|"json"
  readonly destination?: string;
}

export interface MetricsProperty {
  readonly namespace: string;
  readonly name: string;
  readonly dimensionSelect: {readonly [key: string]: ReadonlyArray<string>}
  readonly statistic: string;
  readonly label: string;
  readonly id: string;
  readonly unit?: StandardUnit;
  readonly periodMinutes?: number;
}

export interface Metrics {
  readonly fromDate: string;
  readonly toDate: string;

  properties: MetricsProperty[]

  readonly unit?: StandardUnit;
  readonly periodMinutes?: number;
  readonly dimensionSelect?: {readonly [key: string]: ReadonlyArray<string>}
  readonly namespace?: string;
}

export interface Config {

  readonly aws: ConfigurationOptions & ConfigurationServicePlaceholders & APIVersions & {readonly [key: string]: any};

  readonly output: Output;

  readonly metrics: Metrics;

}