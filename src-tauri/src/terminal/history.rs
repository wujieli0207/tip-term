use std::collections::HashSet;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;

const DEFAULT_HISTORY_LIMIT: usize = 60;
const MAX_HISTORY_LIMIT: usize = 200;
const MAX_COMMAND_LENGTH: usize = 500;

pub fn get_shell_history(prefix: Option<&str>, limit: Option<usize>) -> Result<Vec<String>, String> {
    let limit = limit.unwrap_or(DEFAULT_HISTORY_LIMIT).min(MAX_HISTORY_LIMIT);
    let prefix = prefix.unwrap_or("");
    let history_path = resolve_history_path()?;

    let file = File::open(&history_path)
        .map_err(|e| format!("Failed to open history file: {}", e))?;
    let reader = BufReader::new(file);

    let mut lines = Vec::new();
    for line in reader.lines() {
        if let Ok(line) = line {
            lines.push(line);
        }
    }

    let mut results = Vec::new();
    let mut seen = HashSet::new();

    for line in lines.into_iter().rev() {
        let command = parse_zsh_history_line(&line);
        let command = command.trim();
        if command.is_empty() {
            continue;
        }
        if !prefix.is_empty() && !command.starts_with(prefix) {
            continue;
        }
        let command = if command.len() > MAX_COMMAND_LENGTH {
            &command[..MAX_COMMAND_LENGTH]
        } else {
            command
        };
        if seen.insert(command.to_string()) {
            results.push(command.to_string());
        }
        if results.len() >= limit {
            break;
        }
    }

    Ok(results)
}

fn parse_zsh_history_line(line: &str) -> &str {
    if line.starts_with(": ") {
        if let Some(separator) = line.find(';') {
            return &line[separator + 1..];
        }
    }
    line
}

fn resolve_history_path() -> Result<PathBuf, String> {
    if let Ok(histfile) = std::env::var("HISTFILE") {
        if !histfile.trim().is_empty() {
            return Ok(PathBuf::from(histfile));
        }
    }

    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    Ok(PathBuf::from(home).join(".zsh_history"))
}
