import os

def resource_filename(package_or_requirement, resource_name):
    import pykrx
    package_dir = os.path.dirname(pykrx.__file__)
    return os.path.join(package_dir, resource_name)
