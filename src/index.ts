import chalk from 'chalk';
import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';
import { Exporter } from './exporter';

const args = process.argv;
args.splice(0, 2);

if (!args || args.length === 0) {
  console.log(chalk.red.bold('You need to specify a path to a config file'));
  process.exit(1)
}

let config: any;

try {
  config = safeLoad(readFileSync(args[0], 'utf-8'));
} catch(e) {
  console.log(chalk.red.bold('Please specify a valid config file.'));
  console.log(chalk.italic.red(e.message));
  process.exit(1)
}

if (config) {
  const exporter = new Exporter(config);
  exporter.export()
    .catch(e => console.error(chalk.red(e)))
}

