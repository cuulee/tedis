'use strict';

import React from 'react';
import commands from 'redis-commands';

require('./Terminal.scss');

class Terminal extends React.Component {
  constructor() {
    super();
    this.onSelectBinded = this.onSelect.bind(this);
  }

  componentDidMount() {
    const redis = this.props.redis;
    redis.on('select', this.onSelectBinded);
    this.terminal = $(this.refs.terminal).terminal((command, term) => {
      command = command.trim().replace(/\s+/g, ' ').split(' ');
      const commandName = command[0] && command[0].toUpperCase();
      if (commandName === 'FLUSHALL' || commandName === 'FLUSHDB') {
        term.push(input => {
          if (input.match(/y|yes/i)) {
            this.execute(term, command);
            term.pop();
          } else if (input.match(/n|no/i)) {
            term.pop();
          }
        }, {
          prompt: '[[;#aac6e3;]Are you sure (y/n)? ]'
        });
      } else {
        this.execute(term, command);
      }
    }, {
      greetings: '',
      exit: false,
      completion(_, command, callback) {
        const commandName = command.split(' ')[0];
        const lower = commandName.toLowerCase();
        const isUppercase = commandName.toUpperCase() === commandName;
        callback(
          commands.list
          .filter(item => item.indexOf(lower) === 0)
          .map(item => {
            const last = item.slice(commandName.length);
            return commandName + (isUppercase ? last.toUpperCase() : last);
          })
        );
      },
      // completion: commands.list.concat(commands.list.map(c => c.toUpperCase())),
      name: this.props.connectionKey,
      height: '100%',
      width: '100%',
      prompt: `[[;#fff;]redis> ]`,
      keydown(e) {
        return true;
        if (e.ctrlKey || e.metaKey) {
          if ([81, 82, 87].indexOf(e.which) !== -1) {
            e.preventDefault();
            return true;
            // return false;
          }
        }
      }
    });
  }

  onSelect(db) {
    this.props.onDatabaseChange(db);
  }

  execute(term, args) {
    term.pause();
    const redis = this.props.redis;
    redis.call.apply(redis, args).then(res => {
      term.echo(getHTML(res), { raw: true });
      term.resume();
    }).catch(err => {
      term.echo(getHTML(err), { raw: true });
      term.resume();
    });
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.style.display === 'none' && nextProps.style.display === 'block') {
      this.terminal.focus();
    }
  }

  componentWillUnmount() {
    this.props.redis.removeAllListeners('select', this.onSelectBinded);
  }

  render() {
    return <div ref="terminal" style={this.props.style} className="Terminal">
    </div>;
  }
}

export default Terminal;

function getHTML(response) {
  if (Array.isArray(response)) {
    return `<ul class="array-resp">
    ${response.map((item, index) => '<li><span>' + index + '</span>' + getHTML(item) + '</li>').join('')}
    </ul>`;
  }
  const type = typeof response;
  if (type === 'number') {
    return `<div class="number">${response}</div>`;
  }
  if (type === 'string') {
    return `<div class="string">${response.replace(/\r?\n/g, '<br>')}</div>`;
  }
  if (response === null) {
    return `<div class="null">null</div>`;
  }
  if (response instanceof Error) {
    return `<div class="error">${response.message}</div>`;
  }
  if (type === 'object') {
    return `<ul class="object-resp">
    ${Object.keys(response).map(item => '<li><span class="key">' + item + '</span>' + getHTML(response[item]) + '</li>').join('')}
    <ul>`;
  }

  return `<div class="json">${JSON.stringify(response)}</div>`;
}
