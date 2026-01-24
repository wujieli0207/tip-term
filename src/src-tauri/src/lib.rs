// Re-export terminal module for library use
pub mod terminal;

pub use terminal::TerminalSession;
pub use terminal::vte_parser::PtyWriter;
