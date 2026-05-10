import os


def get_file_extension(filename: str) -> str:
    if not filename or "." not in filename:
        raise ValueError("Cannot determine file extension")
    return filename.rsplit(".", 1)[-1].lower()


def validate_conversion(input_ext: str, output_format: str, allowed: dict) -> str | None:
    input_ext = input_ext.lower()
    output_format = output_format.lower()

    if input_ext not in allowed:
        return f"Unsupported input format: .{input_ext}"

    if output_format not in allowed[input_ext]:
        return (
            f"Cannot convert .{input_ext} to .{output_format}. "
            f"Allowed targets: {', '.join(allowed[input_ext])}"
        )

    return None
